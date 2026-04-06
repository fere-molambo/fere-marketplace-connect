import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PBKDF2 PIN hashing (same as phone-auth)
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

function generateInternalPassword(): string {
  return crypto.randomUUID();
}

const PHONE_BASED_ROLES = ['vendeur', 'livreur', 'membre', 'equipe'];
const ADMIN_ROLES = ['super_admin', 'admin'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating user via edge function...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requesting user is authenticated and authorized
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Non authentifié');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error('Non authentifié');

    console.log('Authenticated user:', user.id);

    // Check permissions
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) throw new Error('Erreur lors de la vérification des permissions');

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('super_admin') || roles.includes('admin') || roles.includes('vendeur');
    if (!isAdmin) throw new Error('Permissions insuffisantes');

    // Get request data
    const { email, password, nom_complet, contact, role, pin } = await req.json();

    const isPhoneBasedRole = PHONE_BASED_ROLES.includes(role);

    if (isPhoneBasedRole) {
      // ========== PHONE-BASED ROLE ==========
      if (!contact || !/^\+\d{10,15}$/.test(contact)) {
        throw new Error('Numéro de téléphone invalide. Format: +223XXXXXXXX');
      }
      if (!pin || !/^\d{6}$/.test(pin)) {
        throw new Error('Le PIN doit contenir exactement 6 chiffres');
      }

      // Check phone uniqueness
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('contact', contact)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Ce numéro de téléphone est déjà associé à un compte');
      }

      const internalPassword = generateInternalPassword();
      const fictiveEmail = `${contact.replace('+', '')}@phone.fere.app`;

      console.log('Creating phone-based user:', fictiveEmail);

      // Create user in auth with fictive email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fictiveEmail,
        password: internalPassword,
        email_confirm: true,
        user_metadata: { nom_complet, contact },
      });

      if (createError) throw createError;

      console.log('User created:', newUser.user.id);

      // Wait for handle_new_user trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with created_by and optional real email
      const profileUpdate: Record<string, any> = { created_by: user.id };
      if (email?.trim()) {
        profileUpdate.email = email.trim();
      }
      await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', newUser.user.id);

      // Hash PIN and store in user_pins
      const pinHash = await hashPin(pin);
      const { error: pinError } = await supabaseAdmin.from('user_pins').insert({
        user_id: newUser.user.id,
        pin_hash: pinHash,
        internal_password: internalPassword,
      });

      if (pinError) {
        console.error('PIN insert error:', pinError);
        throw new Error('Erreur lors de la création du PIN');
      }

      // Create the role
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: role,
      });

      if (roleError) throw roleError;

      console.log('Phone-based user created successfully with role:', role);
      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      // ========== ADMIN ROLE (email + password) ==========
      if (!email) throw new Error('Email requis pour les rôles admin');
      if (!password || password.length < 8) throw new Error('Mot de passe requis (min 8 caractères)');

      console.log('Creating admin user:', email);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nom_complet, contact },
      });

      if (createError) throw createError;

      console.log('User created:', newUser.user.id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabaseAdmin.from('profiles').update({ created_by: user.id }).eq('id', newUser.user.id);

      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: role,
      });

      if (roleError) throw roleError;

      console.log('Admin user created successfully with role:', role);
      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Une erreur est survenue' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
