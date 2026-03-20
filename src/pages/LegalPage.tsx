import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Loader2, FileText, Shield, Cookie } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface LegalPageProps {
  field: "cgu" | "privacy_policy" | "cookies";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const LegalPage = ({ field, title, subtitle, icon }: LegalPageProps) => {
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

      {/* Hero banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 max-w-3xl">
          <div className="flex items-center gap-3 mb-3 opacity-80">
            {icon}
            <span className="text-sm font-medium uppercase tracking-wider">{subtitle}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">{title}</h1>
          <p className="mt-3 text-sm opacity-70">
            Dernière mise à jour : 20 mars 2026
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-10 md:py-14 max-w-3xl">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <article className="legal-content">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-foreground mt-10 mb-3 pb-2 border-b border-border">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-foreground mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1.5 mb-4 text-sm text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1.5 mb-4 text-sm text-muted-foreground">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6 rounded-lg border border-border">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="text-left px-4 py-2.5 font-medium text-foreground border-b border-border text-xs uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2.5 text-muted-foreground border-b border-border last:border-b-0">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-10 border-border" />,
                a: ({ children, href }) => (
                  <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Ce document n'est pas encore disponible.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export const CguPage = () => (
  <LegalPage
    field="cgu"
    title="Conditions Générales d'Utilisation"
    subtitle="Document légal"
    icon={<FileText className="h-5 w-5" />}
  />
);

export const PrivacyPage = () => (
  <LegalPage
    field="privacy_policy"
    title="Politique de Confidentialité"
    subtitle="Protection des données"
    icon={<Shield className="h-5 w-5" />}
  />
);

export const CookiesPage = () => (
  <LegalPage
    field="cookies"
    title="Politique de Cookies"
    subtitle="Stockage local"
    icon={<Cookie className="h-5 w-5" />}
  />
);

export default LegalPage;
