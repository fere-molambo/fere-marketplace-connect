import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128, "Mot de passe trop long"),
  nom_complet: z.string().trim().min(2, "Nom trop court").max(100, "Nom trop long"),
  contact: z.string().regex(/^\+\d{10,15}$/, "Format de contact invalide (ex: +22370123456)"),
  role: z.enum(['super_admin', 'admin', 'vendeur', 'livreur', 'membre', 'equipe'], {
    errorMap: () => ({ message: "Rôle invalide" })
  })
});

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

    // Parse and validate request body
    const rawData = await req.json();
    const validationResult = createUserSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation error:', errors);
      return new Response(
        JSON.stringify({ error: `Données invalides: ${errors}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { email, password, nom_complet, contact, role } = validationResult.data;

    // Role-based permission check for creating specific roles
    if (role === 'super_admin' && !roles.includes('super_admin')) {
      throw new Error('Seul un super admin peut créer un autre super admin');
    }
    
    if (role === 'admin' && !roles.includes('super_admin') && !roles.includes('admin')) {
      throw new Error('Permissions insuffisantes pour créer un admin');
    }

    if (roles.includes('vendeur') && role !== 'equipe') {
      throw new Error('Un vendeur ne peut créer que des membres équipe');
    }

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

    // Update profile with created_by
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ created_by: user.id })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Non-blocking error, continue with role creation
    }

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
