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

    // Clean up all user-related data before deleting from auth
    // (foreign keys referencing profiles prevent auth.users deletion)
    console.log('Cleaning up user data for:', userId);

    // Hard-delete relations owned by the user
    const deleteCleanupTargets = [
      { table: 'pending_payouts', column: 'recipient_id' },
      { table: 'refunds', column: 'user_id' },
      { table: 'client_penalties', column: 'user_id' },
      { table: 'token_transactions', column: 'user_id' },
      { table: 'user_tokens', column: 'user_id' },
      { table: 'favorites', column: 'user_id' },
      { table: 'notification_preferences', column: 'user_id' },
      { table: 'device_tokens', column: 'user_id' },
      { table: 'live_tracking_sessions', column: 'tracker_id' },
      { table: 'blocked_users', column: 'blocker_id' },
      { table: 'blocked_users', column: 'blocked_id' },
      { table: 'driver_zones', column: 'driver_id' },
    ];

    // Nullify optional references (audit/assignment fields) that would block profile deletion
    const nullifyCleanupTargets = [
      { table: 'shops', column: 'responsible_admin_id' },
      { table: 'shops', column: 'created_by' },
      { table: 'profiles', column: 'created_by' },
      { table: 'shop_team_members', column: 'assigned_by' },
      { table: 'service_bookings', column: 'accepted_by' },
      { table: 'delivery_zones', column: 'created_by' },
      { table: 'faq_items', column: 'created_by' },
      { table: 'generated_images', column: 'created_by' },
      { table: 'flash_sales', column: 'created_by' },
      { table: 'shop_stories', column: 'created_by' },
      { table: 'team_assignment_tags', column: 'created_by' },
      { table: 'tutorials', column: 'created_by' },
    ];

    for (const { table, column } of deleteCleanupTargets) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
      if (error) {
        console.warn(`Warning cleaning ${table}.${column}:`, error.message);
      }
    }

    for (const { table, column } of nullifyCleanupTargets) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ [column]: null })
        .eq(column, userId);

      if (error) {
        console.warn(`Warning nullifying ${table}.${column}:`, error.message);
      }
    }

    // Clean up conversations: remove participant entries, then orphan conversations
    const { data: participantConvos } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    await supabaseAdmin.from('conversation_participants').delete().eq('user_id', userId);

    // Delete messages sent by this user
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId);

    // Clean up shops owned by user (and their dependent data)
    const { data: userShops } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('owner_id', userId);

    if (userShops && userShops.length > 0) {
      const shopIds = userShops.map(s => s.id);
      for (const shopId of shopIds) {
        // Delete products and services of each shop
        await supabaseAdmin.from('flash_sales').delete().eq('product_id', shopId); // will miss, but safe
        await supabaseAdmin.from('products').delete().eq('shop_id', shopId);
        await supabaseAdmin.from('services').delete().eq('shop_id', shopId);
        await supabaseAdmin.from('generated_images').delete().eq('shop_id', shopId);
        await supabaseAdmin.from('shop_stories').delete().eq('shop_id', shopId);
        await supabaseAdmin.from('shop_reviews').delete().eq('shop_id', shopId);
        await supabaseAdmin.from('shop_team_members').delete().eq('shop_id', shopId);
      }
      await supabaseAdmin.from('shops').delete().in('id', shopIds);
    }

    // Delete user roles
    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleDeleteError) {
      console.error('Error deleting user roles:', roleDeleteError);
      return new Response(
        JSON.stringify({ error: roleDeleteError.message || 'Erreur lors de la suppression des rôles utilisateur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return new Response(
        JSON.stringify({ error: profileDeleteError.message || 'Erreur lors de la suppression du profil utilisateur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now delete the user from auth
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
