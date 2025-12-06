import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    try {
      setLoading(true);
      
      // Detect if identifier is email or phone
      const isEmail = identifier.includes("@");
      
      if (isEmail) {
        // Direct login with email
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        if (error) throw error;
        
        toast.success("Connexion réussie !");
      } else {
        // Login with phone: find user by phone number in profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("contact", identifier)
          .maybeSingle();
        
        if (profileError) throw profileError;
        
        if (!profile) {
          throw new Error("Aucun compte trouvé avec ce numéro de téléphone");
        }
        
        // Get the email from auth.users using the user_id
        // We need to use the service to get user email
        // Since we can't access auth.users directly, we'll use a different approach
        // We'll store the email in metadata during signup
        
        // For now, let's try to sign in with the phone as username
        // Actually, Supabase requires email for password login
        // We need to get the email somehow - let's add it to profiles table
        
        toast.error("La connexion par téléphone nécessite une configuration supplémentaire");
        throw new Error("Fonctionnalité en cours de développement");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Erreur lors de la connexion");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    nom_complet: string,
    contact: string,
    email: string,
    password: string,
    role: "vendeur" | "livreur" | "membre"
  ) => {
    try {
      setLoading(true);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nom_complet,
            contact,
          },
        },
      });
      
      if (error) throw error;

      // Enregistrer le rôle via la fonction SECURITY DEFINER
      if (data.user) {
        const { error: roleError } = await supabase
          .rpc("assign_self_role", { role_name: role });

        if (roleError) {
          console.error("Erreur lors de l'attribution du rôle:", roleError);
          // On ne bloque pas l'inscription même si le rôle échoue
        }
      }
      
      toast.success("Inscription réussie ! Vérifiez votre email pour confirmer votre compte.");
    } catch (error: any) {
      console.error("Sign up error:", error);
      
      if (error.message?.includes("already registered")) {
        toast.error("Un compte existe déjà avec cet email");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear local state IMMEDIATELY
      setUser(null);
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      
      // If error is "session_not_found", that's OK - user is already logged out
      if (error && !error.message?.includes("Session not found") && !error.message?.includes("session_not_found")) {
        console.error("Sign out error:", error);
        // Try to sign out locally only as fallback
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      
      toast.success("Déconnexion réussie");
    } catch (error: any) {
      console.error("Sign out error:", error);
      // Even on error, ensure local state is cleared
      setUser(null);
      setSession(null);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      toast.success("Déconnexion réussie");
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    isInitialized,
    signIn,
    signUp,
    signOut,
  };
};
