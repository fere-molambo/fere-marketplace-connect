import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to identify the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the calling user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling user:', callingUser.id);

    // Get the userId to delete from request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User to delete:', userId);

    // Prevent self-deletion
    if (callingUser.id === userId) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas supprimer votre propre compte' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check calling user's roles
    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    if (callerRolesError) {
      console.error('Error fetching caller roles:', callerRolesError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerRolesList = callerRoles?.map(r => r.role) || [];
    const isSuperAdmin = callerRolesList.includes('super_admin');
    const isAdmin = callerRolesList.includes('admin');

    console.log('Caller roles:', callerRolesList);

    // Only super_admin and admin can delete users
    if (!isSuperAdmin && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permission refusée. Seuls les super admins et admins peuvent supprimer des utilisateurs.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target user's roles
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (targetRolesError) {
      console.error('Error fetching target roles:', targetRolesError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification de l\'utilisateur cible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetRolesList = targetRoles?.map(r => r.role) || [];
    const targetIsSuperAdmin = targetRolesList.includes('super_admin');
    const targetIsAdmin = targetRolesList.includes('admin');

    console.log('Target roles:', targetRolesList);

    // Admin cannot delete super_admin or other admins
    if (isAdmin && !isSuperAdmin) {
      if (targetIsSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Un admin ne peut pas supprimer un super admin' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (targetIsAdmin) {
        return new Response(
          JSON.stringify({ error: 'Un admin ne peut pas supprimer un autre admin' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Delete the user from auth (this will cascade to profiles due to FK constraints)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message || 'Erreur lors de la suppression de l\'utilisateur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Utilisateur supprimé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
