import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating user via edge function...');

    // Create Supabase client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is authenticated and authorized
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non authentifié');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Non authentifié');
    }

    console.log('Authenticated user:', user.id);

    // Check if user has admin role
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.error('Roles error:', rolesError);
      throw new Error('Erreur lors de la vérification des permissions');
    }

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('super_admin') || 
                    roles.includes('admin') || 
                    roles.includes('vendeur');
    
    if (!isAdmin) {
      console.error('User does not have admin role:', roles);
      throw new Error('Permissions insuffisantes');
    }

    console.log('User has admin permissions');

    // Get new user data from request
    const { email, password, nom_complet, contact, role } = await req.json();

    console.log('Creating user with email:', email);

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom_complet,
        contact,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw createError;
    }

    console.log('User created:', newUser.user.id);

    // Wait for the handle_new_user trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create the role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
      throw roleError;
    }

    console.log('Role assigned successfully');

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Une erreur est survenue' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
