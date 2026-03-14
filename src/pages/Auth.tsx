import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { loginSchema, LoginFormData } from "@/lib/validators";
import PhoneLoginForm from "@/components/auth/PhoneLoginForm";
import PhoneSignupForm from "@/components/auth/PhoneSignupForm";
import fereLogo from "@/assets/fere-logo.webp";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, signIn, signUp, signOut, signInWithPin } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [noDashboardAccess, setNoDashboardAccess] = useState(false);
  // Login mode: "phone" for phone+PIN, "email" for email+password (admin)
  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");

  // Récupérer les paramètres de la plateforme
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Image selon l'onglet actif
  const authImage = activeTab === "login" 
    ? platformSettings?.image_auth_login 
    : platformSettings?.image_auth_signup;

  const authLogo = platformSettings?.logo_auth_page || fereLogo;
  const appName = platformSettings?.app_name || "Fere";
  const appDescription = platformSettings?.app_description || "La plateforme qui connecte fournisseurs, prestataires de services et clients.";

  // Cleanup stale sessions on mount
  useEffect(() => {
    const cleanupStaleSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    };
    
    cleanupStaleSession();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (rolesLoading) return;
    
    if (!session) {
      setIsRedirecting(false);
      setNoDashboardAccess(false);
      return;
    }

    if (session && (!roles || roles.length === 0)) {
      return;
    }

    const hasDashboardAccess = 
      roles?.includes("super_admin") || 
      roles?.includes("admin") ||
      roles?.includes("vendeur") ||
      roles?.includes("equipe");
    
    if (hasDashboardAccess) {
      setIsRedirecting(true);
      navigate("/dashboard", { replace: true });
    } else {
      setIsRedirecting(true);
      navigate("/", { replace: true });
    }
  }, [session, roles, rolesLoading, navigate]);

  // Email login form (for admins)
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onEmailLogin = async (data: LoginFormData) => {
    try {
      await signIn(data.identifier, data.password);
    } catch (error) {
      // Error handled in hook
    }
  };

  const onPhoneLogin = async (data: { phone: string; pin: string }) => {
    try {
      await signInWithPin(data.phone, data.pin);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  if (noDashboardAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Accès non autorisé</CardTitle>
            <CardDescription>
              Vous êtes connecté mais votre rôle ne vous permet pas d'accéder au dashboard administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les rôles <strong>livreur</strong> et <strong>membre</strong> ont des applications dédiées qui seront disponibles prochainement.
            </p>
            <Button 
              onClick={async () => {
                await signOut();
                setNoDashboardAccess(false);
              }} 
              className="w-full"
            >
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Decorative Image */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 items-center justify-center p-12">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('${authImage}')` }}
        />
        <div className="relative z-10 text-white text-center max-w-md">
          <h1 className="text-4xl font-bold mb-4 font-['Space_Grotesk']">
            Bienvenue sur {appName}
          </h1>
          <p className="text-lg opacity-90">
            {appDescription}
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <img src={authLogo} alt={appName} className="h-16 w-auto mb-6" />
            <h2 className="text-2xl font-bold text-center font-['Space_Grotesk']">
              {activeTab === "login" ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="text-muted-foreground text-center mt-2">
              {activeTab === "login"
                ? "Accédez à votre espace Fere"
                : "Rejoignez la communauté Fere"}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="mt-6">
              {loginMode === "phone" ? (
                <div className="space-y-4">
                  <PhoneLoginForm onSubmit={onPhoneLogin} />
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-primary underline"
                      onClick={() => setLoginMode("email")}
                    >
                      Connexion par email (administrateur)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onEmailLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  placeholder="admin@exemple.com"
                                  className="pl-10"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginForm.formState.isSubmitting}
                      >
                        {loginForm.formState.isSubmitting ? "Connexion..." : "Se connecter"}
                      </Button>
                    </form>
                  </Form>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-primary underline"
                      onClick={() => setLoginMode("phone")}
                    >
                      Connexion par téléphone + PIN
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Signup Tab — Phone-based only */}
            <TabsContent value="signup" className="mt-6">
              <PhoneSignupForm onSuccess={() => setActiveTab("login")} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
