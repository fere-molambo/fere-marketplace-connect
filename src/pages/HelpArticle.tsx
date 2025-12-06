import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content: string | null;
  tag: string | null;
  created_at: string;
}

export default function HelpArticle() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["tutorial-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorials")
        .select("*")
        .eq("slug", slug)
        .eq("type", "article")
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as Tutorial | null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="h-8 w-32 bg-muted animate-pulse rounded mb-8" />
            <div className="h-64 bg-muted animate-pulse rounded-lg mb-8" />
            <div className="h-12 bg-muted animate-pulse rounded mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
            <p className="text-muted-foreground mb-6">
              L'article que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link to="/aide">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'aide
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header with thumbnail */}
        {article.thumbnail_url && (
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={article.thumbnail_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Back Button */}
            <Link to="/aide">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'aide
              </Button>
            </Link>

            {/* Article Header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {article.tag && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {article.tag}
                  </Badge>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(article.created_at), "d MMMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </div>

              {article.description && (
                <p className="mt-4 text-lg text-muted-foreground">
                  {article.description}
                </p>
              )}
            </header>

            {/* Article Content */}
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              {article.content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: article.content
                      .replace(/\n/g, "<br />")
                      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
                      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">
                  Contenu de l'article non disponible.
                </p>
              )}
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
