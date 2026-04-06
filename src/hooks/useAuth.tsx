import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { PhoneLoginFormData } from "@/lib/validators";
import { invokeFunction } from "@/lib/parseFunctionError";

const SUPABASE_PROJECT_ID = "jajfuajmkjulujnwfqen";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const signOutInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignore session updates if signOut is in progress
        if (signOutInProgressRef.current) {
          return;
        }
        
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
      // Ignore if signOut is in progress
      if (signOutInProgressRef.current) {
        return;
      }
      
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
      signOutInProgressRef.current = false; // Reset signOut flag
      
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
      signOutInProgressRef.current = false; // Reset signOut flag
      
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
      signOutInProgressRef.current = true;
      
      // Clear local state IMMEDIATELY
      setUser(null);
      setSession(null);
      
      // Clear all Supabase-related localStorage keys for this project
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`sb-${SUPABASE_PROJECT_ID}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Try global signout first (best effort)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Ignore global signout errors
      }
      
      // Then local signout as fallback
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore local signout errors
      }
      
      toast.success("Déconnexion réussie");
    } catch (error: any) {
      console.error("Sign out error:", error);
      // Even on error, ensure local state is cleared
      setUser(null);
      setSession(null);
      toast.success("Déconnexion réussie");
    } finally {
      setLoading(false);
      // Keep signOutInProgressRef true to prevent any stale session restoration
    }
  };

  const signInWithPin = async (phone: string, pin: string) => {
    try {
      setLoading(true);
      signOutInProgressRef.current = false;

      const { data, error } = await supabase.functions.invoke("phone-auth", {
        body: { action: "login", phone, pin },
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);

      // Set session from the returned data
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Connexion réussie !");
      }
    } catch (error: any) {
      console.error("Sign in with PIN error:", error);
      toast.error(error.message || "Erreur lors de la connexion");
      throw error;
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
    signInWithPin,
  };
};
