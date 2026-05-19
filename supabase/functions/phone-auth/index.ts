import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_OTP_PER_HOUR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 3;
const OTP_EXPIRY_MINUTES = 5;

// ============================================================
// PBKDF2-based password hashing (Web Crypto API)
// ============================================================
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const newHashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (newHashHex.length !== hashHex.length) return false;
  let result = 0;
  for (let i = 0; i < newHashHex.length; i++) {
    result |= newHashHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================
// ORANGE MALI SMS API — OTP generation (local) + SMS delivery (Orange)
// Docs: https://developer.orange.com/apis/sms/getting-started
// Mali sender (official): tel:+2230000 (default sender name applied server-side)
// ============================================================
let cachedOrangeToken: { token: string; expiresAt: number } | null = null;

type OrangeSmsDiagnostic = {
  stage: 'token' | 'sms_send' | 'config' | 'network';
  orange_status?: number;
  orange_body?: string;
  orange_request_id?: string;
  message: string;
};

async function getOrangeAccessToken(forceRefresh = false): Promise<string> {
  const authHeader = Deno.env.get('ORANGE_SMS_AUTH_HEADER');
  if (!authHeader) {
    console.error('[OrangeSMS] Token request → ORANGE_SMS_AUTH_HEADER missing');
    throw new Error('ORANGE_SMS_AUTH_HEADER not configured');
  }

  if (!forceRefresh && cachedOrangeToken && cachedOrangeToken.expiresAt > Date.now() + 60_000) {
    console.log('[OrangeSMS] Token request → cache HIT (expires in', Math.round((cachedOrangeToken.expiresAt - Date.now()) / 1000), 's)');
    return cachedOrangeToken.token;
  }

  console.log(`[OrangeSMS] Token request → URL=https://api.orange.com/oauth/v3/token, auth_header_len=${authHeader.length}, has_basic_prefix=${authHeader.startsWith('Basic ')}, cache=MISS${forceRefresh ? ' (forced)' : ''}`);

  const res = await fetch('https://api.orange.com/oauth/v3/token', {
    method: 'POST',
    headers: {
      'Authorization': authHeader.startsWith('Basic ') ? authHeader : `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[OrangeSMS] Token response → status=${res.status}, body=${text}`);
    const err: any = new Error(`Orange OAuth failed: ${res.status}`);
    err.diagnostic = {
      stage: 'token' as const,
      orange_status: res.status,
      orange_body: text,
      message: `OAuth Orange a échoué (HTTP ${res.status})`,
    };
    throw err;
  }
  const data = JSON.parse(text);
  cachedOrangeToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
  };
  const tokenPrefix = (data.access_token || '').substring(0, 8);
  console.log(`[OrangeSMS] Token response → status=200, expires_in=${data.expires_in}s, token_type=${data.token_type}, token_prefix=${tokenPrefix}...`);
  return cachedOrangeToken.token;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * Generate a 6-digit OTP locally, send via Orange Mali SMS API, return the SHA-256 hash
 * to store in DB for later verification. Returns { hash } on success or { diagnostic } on failure.
 */
async function sendOtpOrange(phone: string): Promise<{ hash?: string; diagnostic?: OrangeSmsDiagnostic }> {
  const sender = Deno.env.get('ORANGE_SMS_SENDER_ADDRESS');
  if (!sender) {
    console.error('[OrangeSMS] Config → ORANGE_SMS_SENDER_ADDRESS missing');
    return { diagnostic: { stage: 'config', message: 'ORANGE_SMS_SENDER_ADDRESS non configuré' } };
  }

  const code = generateOtp();
  const message = `Fere : votre code de verification est ${code}. Valide ${OTP_EXPIRY_MINUTES} minutes. Ne le partagez avec personne.`;
  const receiver = phone.startsWith('tel:') ? phone : `tel:${phone}`;
  const senderEncoded = encodeURIComponent(sender);
  const url = `https://api.orange.com/smsmessaging/v1/outbound/${senderEncoded}/requests`;

  const payload = {
    outboundSMSMessageRequest: {
      address: receiver,
      senderAddress: sender,
      outboundSMSTextMessage: { message },
    },
  };

  // Mask recipient: keep only last 4 digits in logs
  const recipientMasked = phone.length > 4 ? `***${phone.slice(-4)}` : '***';
  console.log(`[OrangeSMS] Outbound request → sender="${sender}", sender_encoded="${senderEncoded}", recipient=${recipientMasked}, endpoint=${url}, message_length=${message.length}`);
  console.log(`[OrangeSMS] Outbound body → ${JSON.stringify(payload)}`);

  const doPost = async (token: string) => fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  try {
    let token = await getOrangeAccessToken();
    let res = await doPost(token);

    if (res.status === 401) {
      console.warn(`[OrangeSMS] 401 → token expired/invalid, forcing refresh, retrying outbound. www-authenticate=${res.headers.get('www-authenticate')}`);
      // drain body
      await res.text();
      token = await getOrangeAccessToken(true);
      res = await doPost(token);
    }

    const text = await res.text();
    const requestId = res.headers.get('x-request-id') || res.headers.get('x-correlation-id') || undefined;
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      console.error(`[OrangeSMS] Outbound response → status=${res.status}, content-type=${contentType}, request_id=${requestId || 'n/a'}, body=${text}`);
      let orangeMsg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        orangeMsg = parsed?.requestError?.serviceException?.text
          || parsed?.requestError?.policyException?.text
          || parsed?.error_description
          || parsed?.message
          || orangeMsg;
      } catch { /* not JSON */ }
      return {
        diagnostic: {
          stage: 'sms_send',
          orange_status: res.status,
          orange_body: text,
          orange_request_id: requestId,
          message: orangeMsg,
        },
      };
    }

    let resourceId: string | undefined;
    try {
      const parsed = JSON.parse(text);
      const resourceURL = parsed?.outboundSMSMessageRequest?.resourceURL;
      if (resourceURL) resourceId = resourceURL.split('/').pop();
    } catch { /* ignore */ }
    console.log(`[OrangeSMS] Outbound response → status=${res.status}, request_id=${requestId || 'n/a'}, resource_id=${resourceId || 'n/a'}, recipient=${recipientMasked} ✅ SENT`);
    return { hash: await sha256Hex(code) };
  } catch (err: any) {
    if (err?.diagnostic) {
      // Bubble up token-stage diagnostic
      return { diagnostic: err.diagnostic };
    }
    console.error(`[OrangeSMS] Network error → name=${err?.name}, message=${err?.message}, stack=${err?.stack}`);
    return {
      diagnostic: {
        stage: 'network',
        message: `Erreur réseau Orange: ${err?.message || 'unknown'}`,
      },
    };
  }
}

/**
 * Verify a submitted OTP against the stored SHA-256 hash.
 */
async function verifyOtpLocal(submittedOtp: string, storedHash: string): Promise<boolean> {
  if (!storedHash || storedHash === 'FAILED') return false;
  if (!/^\d{6}$/.test(submittedOtp)) return false;
  const submittedHash = await sha256Hex(submittedOtp);
  return constantTimeEqual(submittedHash, storedHash);
}

Deno.serve(async (req) => {
  console.log(`[phone-auth] Request received: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;
    console.log(`[phone-auth] action=${action}`);

    switch (action) {
      case 'register':
        return await handleRegister(supabaseAdmin, body);
      case 'verify-registration':
        return await handleVerifyRegistration(supabaseAdmin, body);
      case 'login':
        return await handleLogin(supabaseAdmin, body);
      case 'reset-pin-request':
        return await handleResetPinRequest(supabaseAdmin, body);
      case 'reset-pin-confirm':
        return await handleResetPinConfirm(supabaseAdmin, body);
      case 'request-admin-reset':
        return await handleRequestAdminReset(supabaseAdmin, body);
      case 'admin-fix-user':
        return await handleAdminFixUser(supabaseAdmin, body, req);
      default:
        throw new Error('Invalid action. Use: register, verify-registration, login, reset-pin-request, reset-pin-confirm, request-admin-reset, admin-fix-user');
    }
  } catch (err) {
    const error = err as Error;
    console.error('[phone-auth] Error:', error.message);
    return jsonResponse({ success: false, error: error.message }, 400);
  }
});

// ============================================================
// REGISTER
// ============================================================
async function handleRegister(supabaseAdmin: any, body: any) {
  const { phone, full_name, pin, role, email } = body;

  // Validate inputs
  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('Numéro de téléphone invalide. Format: +223XXXXXXXX');
  }
  if (!full_name || full_name.trim().length < 2) {
    throw new Error('Nom complet requis (min 2 caractères)');
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    throw new Error('Le PIN doit contenir exactement 6 chiffres');
  }
  const validRoles = ['membre', 'vendeur', 'livreur'];
  if (!role || !validRoles.includes(role)) {
    throw new Error('Rôle invalide. Choisissez: membre, vendeur ou livreur');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Format email invalide');
  }

  // Check if phone already exists in profiles
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (existingProfile) {
    throw new Error('Ce numéro de téléphone est déjà associé à un compte');
  }

  // Check OTP rate limit
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count: otpCount } = await supabaseAdmin
    .from('otp_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('sent_at', oneHourAgo);

  if ((otpCount || 0) >= MAX_OTP_PER_HOUR) {
    throw new Error('Trop de demandes OTP. Réessayez dans 1 heure');
  }

  // Hash PIN with PBKDF2
  const pinHash = await hashPin(pin);

  // Record OTP rate limit
  await supabaseAdmin.from('otp_rate_limits').insert({ phone });

  // Send OTP via Orange Mali SMS API (returns stored hash on success)
  const otpResult = await sendOtpOrange(phone);
  const otpHash = otpResult.hash;
  const smsSent = !!otpHash;

  // Store otpToken (or placeholder if failed) in pending_registrations
  const { error: upsertError } = await supabaseAdmin
    .from('pending_registrations')
    .upsert({
      phone,
      full_name: full_name.trim(),
      email: email?.trim() || null,
      role,
      pin_hash: pinHash,
      otp_code: otpHash || 'FAILED',
      otp_expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString(),
      otp_attempts: 0,
    }, { onConflict: 'phone' });

  if (upsertError) {
    console.error('[phone-auth] Upsert error:', upsertError);
    throw new Error('Erreur lors de l\'enregistrement');
  }

  if (!smsSent) {
    const diag = otpResult.diagnostic;
    console.error(`[phone-auth] OTP send failed for ${phone}`, diag);
    return jsonResponse({
      success: true,
      sms_sent: false,
      message: 'Erreur d\'envoi du SMS. Veuillez réessayer.',
      stage: diag?.stage,
      orange_status: diag?.orange_status,
      orange_message: diag?.message,
      orange_request_id: diag?.orange_request_id,
    });
  }

  return jsonResponse({ success: true, sms_sent: true, message: 'Code de vérification envoyé par SMS' });
}

// ============================================================
// VERIFY REGISTRATION (via Ikoddi OTP verify)
// ============================================================
async function handleVerifyRegistration(supabaseAdmin: any, body: any) {
  const { phone, otp } = body;

  if (!phone || !otp) {
    throw new Error('Téléphone et code OTP requis');
  }

  // Find pending registration
  const { data: pending, error: pendingError } = await supabaseAdmin
    .from('pending_registrations')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (pendingError || !pending) {
    throw new Error('Aucune inscription en attente pour ce numéro');
  }

  // Check expiry
  if (new Date(pending.otp_expires_at) < new Date()) {
    throw new Error('Code expiré. Cliquez sur « Renvoyer le code » pour recevoir un nouveau code');
  }

  // Check stored token
  if (!pending.otp_code || pending.otp_code === 'FAILED') {
    throw new Error('L\'envoi du SMS a échoué. Cliquez sur « Renvoyer le code »');
  }

  // Verify OTP locally against stored hash
  const otpValid = await verifyOtpLocal(otp, pending.otp_code);

  if (!otpValid) {
    const nextAttempts = (pending.otp_attempts || 0) + 1;
    if (nextAttempts >= 5) {
      await supabaseAdmin.from('pending_registrations').delete().eq('phone', phone);
      throw new Error('Trop de tentatives. Veuillez recommencer l\'inscription');
    }
    await supabaseAdmin
      .from('pending_registrations')
      .update({ otp_attempts: nextAttempts })
      .eq('phone', phone);
    throw new Error(`Code incorrect. ${5 - nextAttempts} tentative(s) restante(s)`);
  }

  // OTP is valid — create user
  const internalPassword = generateInternalPassword();
  const fictiveEmail = `${phone.replace('+', '')}@phone.fere.app`;

  let userId: string;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: fictiveEmail,
    password: internalPassword,
    email_confirm: true,
    user_metadata: {
      nom_complet: pending.full_name,
      contact: phone,
    },
  });

  if (authError) {
    const msg = (authError.message || '').toLowerCase();
    const isDuplicate = msg.includes('already been registered') || msg.includes('already registered') || msg.includes('already exists');
    if (!isDuplicate) {
      console.error('[phone-auth] Auth create error:', authError);
      throw new Error('Erreur lors de la création du compte: ' + authError.message);
    }

    // Recover orphaned account from a previous failed attempt: find existing user and reset password
    console.warn('[phone-auth] User already exists for', fictiveEmail, '— recovering account');
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) {
      throw new Error('Erreur lors de la récupération du compte existant');
    }
    const existing = list.users.find((u: any) => u.email === fictiveEmail);
    if (!existing) {
      throw new Error('Compte existant introuvable. Contactez le support.');
    }
    userId = existing.id;
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: internalPassword,
      email_confirm: true,
      user_metadata: { nom_complet: pending.full_name, contact: phone },
    });
    if (updErr) {
      throw new Error('Erreur lors de la mise à jour du compte: ' + updErr.message);
    }
    // Clean previous pin/role rows so re-inserts succeed
    await supabaseAdmin.from('user_pins').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  } else {
    userId = authData.user.id;
  }

  // Wait for handle_new_user trigger
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Update profile with optional email if provided
  if (pending.email) {
    await supabaseAdmin
      .from('profiles')
      .update({ email: pending.email })
      .eq('id', userId);
  }

  // Store PIN hash and internal password
  const { error: pinError } = await supabaseAdmin.from('user_pins').insert({
    user_id: userId,
    pin_hash: pending.pin_hash,
    internal_password: internalPassword,
  });

  if (pinError) {
    console.error('[phone-auth] PIN insert error:', pinError);
  }

  // Assign role
  const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    role: pending.role,
  });

  if (roleError) {
    console.error('[phone-auth] Role insert error:', roleError);
  }

  // Delete pending registration
  await supabaseAdmin.from('pending_registrations').delete().eq('phone', phone);

  console.log(`[phone-auth] User created: ${userId}, role: ${pending.role}`);
  return jsonResponse({ success: true, message: 'Compte créé avec succès. Connectez-vous maintenant.' });
}

// ============================================================
// LOGIN
// ============================================================
async function handleLogin(supabaseAdmin: any, body: any) {
  const { phone, pin } = body;

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('Numéro de téléphone invalide');
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN invalide (6 chiffres requis)');
  }

  // Check brute-force protection
  const { data: loginAttempt } = await supabaseAdmin
    .from('login_attempts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (loginAttempt?.blocked_until) {
    const blockedUntil = new Date(loginAttempt.blocked_until);
    if (blockedUntil > new Date()) {
      const remainingSeconds = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
      return jsonResponse({
        success: false,
        error: `Compte temporairement bloqué. Réessayez dans ${remainingSeconds} secondes`,
        blocked_until: loginAttempt.blocked_until,
        remaining_seconds: remainingSeconds,
      }, 429);
    }
  }

  // Find profile by phone
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, is_blocked, blocked_reason')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    await recordFailedLogin(supabaseAdmin, phone);
    throw new Error('Identifiants incorrects');
  }

  // Check if user is blocked by admin
  if (profile.is_blocked) {
    // Get support contact info from platform_settings
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('support_email, support_phone')
      .limit(1)
      .maybeSingle();

    return jsonResponse({
      success: false,
      error: 'account_blocked',
      message: 'Votre compte a été suspendu.',
      reason: profile.blocked_reason || 'Contactez le support pour plus d\'informations.',
      support_phone: settings?.support_phone || '+22300000000',
      support_email: settings?.support_email || 'support@fere.app',
    }, 403);
  }

  // Get user PIN data
  const { data: userPin } = await supabaseAdmin
    .from('user_pins')
    .select('pin_hash, internal_password')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!userPin) {
    throw new Error('Ce compte utilise la connexion par email');
  }

  // Verify PIN with PBKDF2
  const pinValid = await verifyPin(pin, userPin.pin_hash);

  if (!pinValid) {
    await recordFailedLogin(supabaseAdmin, phone);
    throw new Error('Identifiants incorrects');
  }

  // PIN correct — reset login attempts
  await supabaseAdmin
    .from('login_attempts')
    .upsert({ phone, attempts: 0, last_attempt_at: new Date().toISOString(), blocked_until: null }, { onConflict: 'phone' });

  // Sign in with internal password to get session
  const fictiveEmail = `${phone.replace('+', '')}@phone.fere.app`;
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: fictiveEmail,
    password: userPin.internal_password,
  });

  if (signInError) {
    console.error('[phone-auth] SignIn error:', signInError);
    throw new Error('Erreur lors de la connexion');
  }

  console.log(`[phone-auth] Login success for ${phone}`);
  return jsonResponse({
    success: true,
    session: signInData.session,
  });
}

// ============================================================
// RESET PIN REQUEST (self-service via Orange SMS OTP)
// ============================================================
async function handleResetPinRequest(supabaseAdmin: any, body: any) {
  const { phone } = body;

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('Numéro de téléphone invalide');
  }

  // Check phone exists in profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    throw new Error('Aucun compte trouvé avec ce numéro');
  }

  // Check user has a PIN
  const { data: userPin } = await supabaseAdmin
    .from('user_pins')
    .select('user_id')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!userPin) {
    throw new Error('Ce compte utilise la connexion par email');
  }

  // OTP rate limit
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count: otpCount } = await supabaseAdmin
    .from('otp_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('sent_at', oneHourAgo);

  if ((otpCount || 0) >= MAX_OTP_PER_HOUR) {
    throw new Error('Trop de demandes OTP. Réessayez dans 1 heure');
  }

  // Record rate limit
  await supabaseAdmin.from('otp_rate_limits').insert({ phone });

  // Send OTP via Orange Mali SMS API
  const otpResult = await sendOtpOrange(phone);
  const otpHash = otpResult.hash;
  const smsSent = !!otpHash;

  // Store in pending_pin_resets
  const { error: upsertError } = await supabaseAdmin
    .from('pending_pin_resets')
    .upsert({
      phone,
      otp_token: otpHash || 'FAILED',
      otp_expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString(),
      otp_attempts: 0,
    }, { onConflict: 'phone' });

  if (upsertError) {
    console.error('[phone-auth] Reset upsert error:', upsertError);
    throw new Error('Erreur lors de la demande de réinitialisation');
  }

  if (!smsSent) {
    const diag = otpResult.diagnostic;
    console.error(`[phone-auth] Reset OTP send failed for ${phone}`, diag);
    return jsonResponse({
      success: true,
      sms_sent: false,
      message: 'Erreur d\'envoi du SMS. Veuillez réessayer.',
      stage: diag?.stage,
      orange_status: diag?.orange_status,
      orange_message: diag?.message,
      orange_request_id: diag?.orange_request_id,
    });
  }

  return jsonResponse({ success: true, sms_sent: true, message: 'Code de vérification envoyé par SMS' });
}

// ============================================================
// RESET PIN CONFIRM (verify OTP locally + set new PIN)
// ============================================================
async function handleResetPinConfirm(supabaseAdmin: any, body: any) {
  const { phone, otp, new_pin } = body;

  if (!phone || !otp) {
    throw new Error('Téléphone et code OTP requis');
  }
  if (!new_pin || !/^\d{6}$/.test(new_pin)) {
    throw new Error('Le nouveau PIN doit contenir exactement 6 chiffres');
  }

  // Find pending reset
  const { data: pending } = await supabaseAdmin
    .from('pending_pin_resets')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (!pending) {
    throw new Error('Aucune demande de réinitialisation en cours');
  }

  // Check expiry
  if (new Date(pending.otp_expires_at) < new Date()) {
    throw new Error('Code expiré. Demandez un nouveau code');
  }

  // Check stored token
  if (!pending.otp_token || pending.otp_token === 'FAILED') {
    throw new Error('L\'envoi du SMS a échoué. Demandez un nouveau code');
  }

  // Verify OTP locally against stored hash
  const otpValid = await verifyOtpLocal(otp, pending.otp_token);

  if (!otpValid) {
    const nextAttempts = (pending.otp_attempts || 0) + 1;
    if (nextAttempts >= 5) {
      await supabaseAdmin.from('pending_pin_resets').delete().eq('phone', phone);
      throw new Error('Trop de tentatives. Recommencez la procédure');
    }
    await supabaseAdmin
      .from('pending_pin_resets')
      .update({ otp_attempts: nextAttempts })
      .eq('phone', phone);
    throw new Error(`Code incorrect. ${5 - nextAttempts} tentative(s) restante(s)`);
  }

  // Find user
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    throw new Error('Compte introuvable');
  }

  // Hash new PIN and update
  const newPinHash = await hashPin(new_pin);
  const { error: updateError } = await supabaseAdmin
    .from('user_pins')
    .update({ pin_hash: newPinHash })
    .eq('user_id', profile.id);

  if (updateError) {
    console.error('[phone-auth] PIN update error:', updateError);
    throw new Error('Erreur lors de la mise à jour du PIN');
  }

  // Clean up
  await supabaseAdmin.from('pending_pin_resets').delete().eq('phone', phone);

  console.log(`[phone-auth] PIN reset success for ${phone}`);
  return jsonResponse({ success: true, message: 'PIN réinitialisé avec succès. Connectez-vous avec votre nouveau PIN.' });
}

// ============================================================
// REQUEST ADMIN RESET
// ============================================================
async function handleRequestAdminReset(supabaseAdmin: any, body: any) {
  const { phone } = body;

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('Numéro de téléphone invalide');
  }

  // Find user
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    throw new Error('Aucun compte trouvé avec ce numéro');
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabaseAdmin
    .from('pin_reset_requests')
    .select('id')
    .eq('user_phone', phone)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest) {
    return jsonResponse({ success: true, message: 'Une demande est déjà en cours. Un administrateur la traitera bientôt.' });
  }

  // Insert request
  const { error: insertError } = await supabaseAdmin
    .from('pin_reset_requests')
    .insert({
      user_phone: phone,
      user_id: profile.id,
      status: 'pending',
    });

  if (insertError) {
    console.error('[phone-auth] Admin reset request error:', insertError);
    throw new Error('Erreur lors de la demande');
  }

  return jsonResponse({ success: true, message: 'Demande envoyée. Un administrateur réinitialisera votre PIN.' });
}

// ============================================================
// HELPERS
// ============================================================

async function recordFailedLogin(supabaseAdmin: any, phone: string) {
  const { data: existing } = await supabaseAdmin
    .from('login_attempts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  const newAttempts = (existing?.attempts || 0) + 1;
  const blockedUntil = newAttempts >= MAX_LOGIN_ATTEMPTS
    ? new Date(Date.now() + LOGIN_BLOCK_MINUTES * 60000).toISOString()
    : null;

  await supabaseAdmin
    .from('login_attempts')
    .upsert({
      phone,
      attempts: newAttempts,
      last_attempt_at: new Date().toISOString(),
      blocked_until: blockedUntil,
    }, { onConflict: 'phone' });
}

function generateInternalPassword(): string {
  return crypto.randomUUID();
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================
// ADMIN FIX USER (repair broken accounts created via web admin)
// ============================================================
async function handleAdminFixUser(supabaseAdmin: any, body: any, req: Request) {
  const { phone, new_pin } = body;

  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('Numéro de téléphone invalide');
  }
  if (!new_pin || !/^\d{6}$/.test(new_pin)) {
    throw new Error('Le nouveau PIN doit contenir exactement 6 chiffres');
  }

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Non authentifié');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !caller) throw new Error('Non authentifié');

  const { data: callerRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id);

  const roles = callerRoles?.map((r: any) => r.role) || [];
  if (!roles.includes('super_admin') && !roles.includes('admin')) {
    throw new Error('Seuls les administrateurs peuvent réparer des comptes');
  }

  // Find user by phone
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    throw new Error('Aucun compte trouvé avec ce numéro');
  }

  const userId = profile.id;
  const newInternalPassword = crypto.randomUUID();
  const fictiveEmail = `${phone.replace('+', '')}@phone.fere.app`;

  // Update auth.users password and email
  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: fictiveEmail,
    password: newInternalPassword,
    email_confirm: true,
  });

  if (updateAuthError) {
    console.error('[phone-auth] Admin fix - auth update error:', updateAuthError);
    throw new Error('Erreur lors de la mise à jour du compte: ' + updateAuthError.message);
  }

  // Hash new PIN
  const newPinHash = await hashPin(new_pin);

  // Upsert user_pins
  const { error: pinError } = await supabaseAdmin
    .from('user_pins')
    .upsert({
      user_id: userId,
      pin_hash: newPinHash,
      internal_password: newInternalPassword,
    }, { onConflict: 'user_id' });

  if (pinError) {
    console.error('[phone-auth] Admin fix - pin upsert error:', pinError);
    throw new Error('Erreur lors de la mise à jour du PIN');
  }

  // Reset login attempts
  await supabaseAdmin
    .from('login_attempts')
    .upsert({ phone, attempts: 0, last_attempt_at: new Date().toISOString(), blocked_until: null }, { onConflict: 'phone' });

  console.log(`[phone-auth] Admin fix success for ${phone} (user: ${userId})`);
  return jsonResponse({ success: true, message: 'Compte réparé avec succès. L\'utilisateur peut se connecter avec le nouveau PIN.' });
}
