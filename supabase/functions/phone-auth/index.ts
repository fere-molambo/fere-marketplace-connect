import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_OTP_PER_HOUR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 3;

// ============================================================
// PBKDF2-based password hashing (Web Crypto API — no Workers needed)
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
// IKODDI OTP API (managed OTP — Ikoddi generates & verifies)
// ============================================================
function getIkoddiConfig() {
  const apiKey = Deno.env.get('IKODDI_API_KEY');
  const otpAppId = Deno.env.get('IKODDI_OTP_APP_ID');
  const orgId = Deno.env.get('IKODDI_ORGANIZATION_ID');
  if (!apiKey || !otpAppId || !orgId) {
    throw new Error('Ikoddi credentials not configured (API_KEY, OTP_APP_ID, ORGANIZATION_ID)');
  }
  return { apiKey, otpAppId, orgId };
}

// Strip '+' from phone for Ikoddi identity
function toIkoddiIdentity(phone: string): string {
  return phone.replace('+', '');
}

async function sendOtpIkoddi(phone: string): Promise<{ otpToken: string }> {
  const { apiKey, otpAppId, orgId } = getIkoddiConfig();
  const identity = toIkoddiIdentity(phone);

  const url = `https://api.ikoddi.com/api/v1/groups/${orgId}/otp/${otpAppId}/sms/${identity}`;
  console.log(`[phone-auth] Ikoddi send OTP → POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
  });

  const responseText = await response.text();
  console.log('[phone-auth] Ikoddi send response:', response.status, responseText);

  if (!response.ok) {
    throw new Error(`Ikoddi OTP send failed: ${response.status} ${responseText}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Ikoddi returned non-JSON: ${responseText}`);
  }

  if (data.status !== 0 || !data.otpToken) {
    throw new Error(`Ikoddi OTP error: ${data.message || responseText}`);
  }

  return { otpToken: data.otpToken };
}

async function verifyOtpIkoddi(phone: string, code: string, otpToken: string): Promise<{ valid: boolean; message?: string }> {
  const { apiKey, otpAppId, orgId } = getIkoddiConfig();
  const identity = toIkoddiIdentity(phone);

  const url = `https://api.ikoddi.com/api/v1/groups/${orgId}/otp/${otpAppId}/verify`;
  console.log(`[phone-auth] Ikoddi verify OTP → POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verificationKey: otpToken,
      otp: code,
      identity,
    }),
  });

  const responseText = await response.text();
  console.log('[phone-auth] Ikoddi verify response:', response.status, responseText);

  if (!response.ok) {
    return { valid: false, message: responseText };
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    return { valid: false, message: responseText };
  }

  if (data.status === 0) {
    return { valid: true };
  }

  return { valid: false, message: data.message || 'Code incorrect' };
}

serve(async (req) => {
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
      default:
        throw new Error('Invalid action. Use: register, verify-registration, login');
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

  // Send OTP via Ikoddi
  let smsSent = false;
  let otpToken: string | null = null;
  try {
    const ikoddiResult = await sendOtpIkoddi(phone);
    otpToken = ikoddiResult.otpToken;
    smsSent = true;
    console.log(`[phone-auth] OTP sent to ${phone} via Ikoddi, otpToken received`);
  } catch (smsError) {
    console.error('[phone-auth] Ikoddi SMS error:', smsError);
  }

  // Upsert pending registration — store otpToken in otp_code column
  const { error: upsertError } = await supabaseAdmin
    .from('pending_registrations')
    .upsert({
      phone,
      full_name: full_name.trim(),
      email: email?.trim() || null,
      role,
      pin_hash: pinHash,
      otp_code: otpToken || 'DEV_FALLBACK',
      otp_expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
      otp_attempts: 0,
    }, { onConflict: 'phone' });

  if (upsertError) {
    console.error('[phone-auth] Upsert error:', upsertError);
    throw new Error('Erreur lors de l\'enregistrement');
  }

  if (!smsSent) {
    // Fallback: generate a dev OTP for testing
    const devOtp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    // Store devOtp for local verification
    await supabaseAdmin
      .from('pending_registrations')
      .update({ otp_code: `DEV:${devOtp}` })
      .eq('phone', phone);
    console.log(`[phone-auth] DEV OTP for ${phone}: ${devOtp}`);
    return jsonResponse({ success: true, sms_sent: false, dev_otp: devOtp, message: 'SMS non envoyé — mode test' });
  }

  return jsonResponse({ success: true, sms_sent: true, message: 'Code de vérification envoyé par SMS' });
}

// ============================================================
// VERIFY REGISTRATION
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

  // Try Ikoddi verification first (if SMS was sent via Ikoddi)
  let otpValid = false;

  if (pending.otp_code === '000000') {
    // OTP was sent via Ikoddi — verify through Ikoddi API
    const ikoddiResult = await verifyOtpIkoddi(phone, otp);
    otpValid = ikoddiResult.valid;
    if (!otpValid) {
      throw new Error('Code de vérification incorrect ou expiré');
    }
  } else {
    // Fallback: local OTP verification (dev mode)
    if (new Date(pending.otp_expires_at) < new Date()) {
      throw new Error('Code expiré. Cliquez sur « Renvoyer le code » pour recevoir un nouveau OTP');
    }
    if (pending.otp_code !== otp) {
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
    otpValid = true;
  }

  // OTP is valid — create user
  const internalPassword = generateInternalPassword();
  const fictiveEmail = `${phone.replace('+', '')}@phone.fere.app`;

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
    console.error('[phone-auth] Auth create error:', authError);
    throw new Error('Erreur lors de la création du compte: ' + authError.message);
  }

  const userId = authData.user.id;

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
    .select('id')
    .eq('contact', phone)
    .maybeSingle();

  if (!profile) {
    await recordFailedLogin(supabaseAdmin, phone);
    throw new Error('Identifiants incorrects');
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
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').substring(0, 32);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
