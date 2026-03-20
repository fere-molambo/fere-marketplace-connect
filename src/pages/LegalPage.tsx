import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Loader2 } from "lucide-react";

interface LegalPageProps {
  field: "cgu" | "privacy_policy" | "cookies";
  title: string;
}

const LegalPage = ({ field, title }: LegalPageProps) => {
  const { data: content, isLoading } = useQuery({
    queryKey: ["legal-content", field],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select(field)
        .maybeSingle();
      return (data as any)?.[field] as string | null;
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">{title}</h1>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
            {content}
          </div>
        ) : (
          <p className="text-muted-foreground">Ce document n'est pas encore disponible.</p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export const CguPage = () => <LegalPage field="cgu" title="Conditions Générales d'Utilisation" />;
export const PrivacyPage = () => <LegalPage field="privacy_policy" title="Politique de Confidentialité" />;
export const CookiesPage = () => <LegalPage field="cookies" title="Politique de Cookies" />;

export default LegalPage;
