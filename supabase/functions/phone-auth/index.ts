import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// OTP Generation + Hashing (local verification)
// ============================================================
function generateOtpCode(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
}

async function hashOtp(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(code), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return `HASH:${saltHex}:${hashHex}`;
}

async function verifyOtpHash(code: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('HASH:')) return false;
  const parts = stored.substring(5).split(':');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(code), 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
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
// IKODDI Simple SMS API (we generate OTP, Ikoddi just sends SMS)
// ============================================================
function getIkoddiConfig() {
  const apiKey = Deno.env.get('IKODDI_API_KEY');
  const orgId = Deno.env.get('IKODDI_ORGANIZATION_ID');
  if (!apiKey || !orgId) {
    throw new Error('Ikoddi credentials not configured (API_KEY, ORGANIZATION_ID)');
  }
  return { apiKey, orgId };
}

function toIkoddiIdentity(phone: string): string {
  return phone.replace('+', '');
}

async function sendSmsIkoddi(phone: string, message: string): Promise<boolean> {
  const { apiKey, orgId } = getIkoddiConfig();
  const identity = toIkoddiIdentity(phone);

  // Extract country code (first 3 digits for CI: 225)
  const countryCode = identity.substring(0, 3);
  // Map country codes to ISO codes
  const isoMap: Record<string, string> = {
    '225': 'CI', '223': 'ML', '226': 'BF', '221': 'SN',
    '228': 'TG', '229': 'BJ', '227': 'NE', '224': 'GN',
  };
  const isoCode = isoMap[countryCode] || 'CI';

  const url = `https://api.ikoddi.com/api/v1/groups/${orgId}/sms`;
  console.log(`[phone-auth] Ikoddi send SMS → POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      sentTo: [identity],
      message,
      from: 'Fere',
      smsBroadCast: 'OTP',
      countryNumberCode: countryCode,
      countryStringCode: isoCode,
    }),
  });

  const responseText = await response.text();
  console.log('[phone-auth] Ikoddi SMS response:', response.status, responseText);

  if (!response.ok) {
    console.error(`[phone-auth] Ikoddi SMS failed: ${response.status} ${responseText}`);
    return false;
  }

  return true;
}

serve(async (req) => {
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

  // Generate OTP code locally
  const otpCode = generateOtpCode();
  const otpHash = await hashOtp(otpCode);

  // Record OTP rate limit
  await supabaseAdmin.from('otp_rate_limits').insert({ phone });

  // Send OTP via Ikoddi simple SMS
  let smsSent = false;
  try {
    const message = `Votre code de vérification Fere est : ${otpCode}. Il expire dans ${OTP_EXPIRY_MINUTES} minutes.`;
    smsSent = await sendSmsIkoddi(phone, message);
    if (smsSent) {
      console.log(`[phone-auth] OTP SMS sent to ${phone} via Ikoddi simple SMS`);
    }
  } catch (smsError) {
    console.error('[phone-auth] Ikoddi SMS error:', smsError);
  }

  // Upsert pending registration — store OTP hash
  const { error: upsertError } = await supabaseAdmin
    .from('pending_registrations')
    .upsert({
      phone,
      full_name: full_name.trim(),
      email: email?.trim() || null,
      role,
      pin_hash: pinHash,
      otp_code: otpHash,
      otp_expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString(),
      otp_attempts: 0,
    }, { onConflict: 'phone' });

  if (upsertError) {
    console.error('[phone-auth] Upsert error:', upsertError);
    throw new Error('Erreur lors de l\'enregistrement');
  }

  if (!smsSent) {
    // Fallback: return dev OTP for testing
    console.log(`[phone-auth] DEV OTP for ${phone}: ${otpCode}`);
    return jsonResponse({ success: true, sms_sent: false, dev_otp: otpCode, message: 'SMS non envoyé — mode test' });
  }

  return jsonResponse({ success: true, sms_sent: true, message: 'Code de vérification envoyé par SMS' });
}

// ============================================================
// VERIFY REGISTRATION (local verification only)
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

  // Verify OTP locally
  let otpValid = false;

  if (pending.otp_code.startsWith('HASH:')) {
    // Normal mode — verify against stored hash
    otpValid = await verifyOtpHash(otp, pending.otp_code);
  } else if (pending.otp_code.startsWith('DEV:')) {
    // Legacy dev fallback
    const devCode = pending.otp_code.replace('DEV:', '');
    otpValid = devCode === otp;
  } else {
    // Legacy Ikoddi otpToken — can't verify locally, reject
    throw new Error('Format OTP obsolète. Cliquez sur « Renvoyer le code » pour un nouveau code');
  }

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
// RESET PIN REQUEST (self-service via OTP)
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

  // Generate OTP locally
  const otpCode = generateOtpCode();
  const otpHash = await hashOtp(otpCode);

  // Send via simple SMS
  let smsSent = false;
  try {
    const message = `Votre code de réinitialisation Fere est : ${otpCode}. Il expire dans ${OTP_EXPIRY_MINUTES} minutes.`;
    smsSent = await sendSmsIkoddi(phone, message);
  } catch (smsError) {
    console.error('[phone-auth] Reset PIN OTP error:', smsError);
  }

  // Store in pending_pin_resets
  const { error: upsertError } = await supabaseAdmin
    .from('pending_pin_resets')
    .upsert({
      phone,
      otp_token: otpHash,
      otp_expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString(),
      otp_attempts: 0,
    }, { onConflict: 'phone' });

  if (upsertError) {
    console.error('[phone-auth] Reset upsert error:', upsertError);
    throw new Error('Erreur lors de la demande de réinitialisation');
  }

  if (!smsSent) {
    console.log(`[phone-auth] DEV Reset OTP for ${phone}: ${otpCode}`);
    return jsonResponse({ success: true, sms_sent: false, dev_otp: otpCode });
  }

  return jsonResponse({ success: true, sms_sent: true, message: 'Code de vérification envoyé par SMS' });
}

// ============================================================
// RESET PIN CONFIRM (verify OTP + set new PIN)
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

  // Verify OTP locally
  let otpValid = false;

  if (pending.otp_token.startsWith('HASH:')) {
    otpValid = await verifyOtpHash(otp, pending.otp_token);
  } else if (pending.otp_token.startsWith('DEV:')) {
    const devCode = pending.otp_token.replace('DEV:', '');
    otpValid = devCode === otp;
  } else {
    throw new Error('Format OTP obsolète. Demandez un nouveau code');
  }

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
