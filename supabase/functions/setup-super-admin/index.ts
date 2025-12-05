import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-setup-secret',
};

// Validation schema for super admin creation
const superAdminSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(12, "Le mot de passe doit contenir au moins 12 caractères").max(128, "Mot de passe trop long"),
  nom_complet: z.string().trim().min(2, "Nom trop court").max(100, "Nom trop long"),
  contact: z.string().regex(/^\+\d{10,15}$/, "Format de contact invalide (ex: +22370123456)")
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify setup secret
    const setupSecret = req.headers.get('X-Setup-Secret');
    const expectedSecret = Deno.env.get('SETUP_SECRET');
    
    if (!expectedSecret) {
      console.error('SETUP_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incomplète' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!setupSecret || setupSecret !== expectedSecret) {
      console.warn('Invalid setup secret attempt');
      return new Response(
        JSON.stringify({ error: 'Secret de configuration invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Vérification de l\'existence d\'un super admin...');

    // Vérifier si un super admin existe déjà
    const { data: existingSuperAdmin, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role', 'super_admin')
      .maybeSingle();

    if (checkError) {
      console.error('Erreur lors de la vérification:', checkError);
      throw checkError;
    }

    if (existingSuperAdmin) {
      console.log('Un super admin existe déjà');
      return new Response(
        JSON.stringify({ error: 'Un super administrateur existe déjà' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validationResult = superAdminSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation error:', errors);
      return new Response(
        JSON.stringify({ error: `Données invalides: ${errors}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { email, password, nom_complet, contact } = validationResult.data;

    console.log(`Création de l'utilisateur ${email}...`);

    // Créer l'utilisateur avec l'API Admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        nom_complet,
        contact
      }
    });

    if (authError) {
      console.error('Erreur lors de la création de l\'utilisateur:', authError);
      throw authError;
    }

    console.log('Utilisateur créé, ID:', authData.user.id);

    // Assigner le rôle super_admin
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'super_admin'
      });

    if (roleError) {
      console.error('Erreur lors de l\'assignation du rôle:', roleError);
      throw roleError;
    }

    console.log('Rôle super_admin assigné avec succès');

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erreur globale:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
