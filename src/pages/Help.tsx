import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Play, BookOpen, HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TutorialVideoCard } from "@/components/help/TutorialVideoCard";
import { TutorialArticleCard } from "@/components/help/TutorialArticleCard";
import { FaqSection } from "@/components/help/FaqSection";
import { VideoPlayerDialog } from "@/components/help/VideoPlayerDialog";

interface Tutorial {
  id: string;
  type: "video" | "article";
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  tag: string | null;
  slug: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Tutorial | null>(null);

  const { data: tutorials = [], isLoading: tutorialsLoading } = useQuery({
    queryKey: ["tutorials-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorials")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Tutorial[];
    },
  });

  const { data: faqItems = [], isLoading: faqLoading } = useQuery({
    queryKey: ["faq-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as FaqItem[];
    },
  });

  const videoTutorials = tutorials.filter((t) => t.type === "video");
  const articleTutorials = tutorials.filter((t) => t.type === "article");

  const filteredVideos = videoTutorials.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArticles = articleTutorials.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tag?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaq = faqItems.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Aide & Tutoriels
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Trouvez des réponses à vos questions, découvrez nos tutoriels vidéo
              et lisez nos guides détaillés pour maîtriser la plateforme.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans l'aide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </section>

        {/* Content Tabs */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="videos" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                <TabsTrigger value="videos" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Vidéos</span>
                </TabsTrigger>
                <TabsTrigger value="articles" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Articles</span>
                </TabsTrigger>
                <TabsTrigger value="faq" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">FAQ</span>
                </TabsTrigger>
              </TabsList>

              {/* Videos Tab */}
              <TabsContent value="videos">
                {tutorialsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : filteredVideos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery
                      ? "Aucun tutoriel vidéo ne correspond à votre recherche"
                      : "Aucun tutoriel vidéo disponible pour le moment"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVideos.map((tutorial) => (
                      <TutorialVideoCard
                        key={tutorial.id}
                        tutorial={tutorial}
                        onPlay={() => setSelectedVideo(tutorial)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Articles Tab */}
              <TabsContent value="articles">
                {tutorialsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery
                      ? "Aucun article ne correspond à votre recherche"
                      : "Aucun article disponible pour le moment"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article) => (
                      <TutorialArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq">
                {faqLoading ? (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : filteredFaq.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery
                      ? "Aucune question ne correspond à votre recherche"
                      : "Aucune FAQ disponible pour le moment"}
                  </div>
                ) : (
                  <FaqSection faqItems={filteredFaq} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        tutorial={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}
