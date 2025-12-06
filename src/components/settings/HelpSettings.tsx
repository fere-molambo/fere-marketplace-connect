import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, BookOpen, HelpCircle, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { CreateTutorialDialog } from "@/components/help/CreateTutorialDialog";
import { CreateFaqDialog } from "@/components/help/CreateFaqDialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Tutorial {
  id: string;
  type: "video" | "article";
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  content: string | null;
  tag: string | null;
  slug: string;
  is_published: boolean;
  display_order: number;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  is_published: boolean;
  display_order: number;
}

export function HelpSettings() {
  const queryClient = useQueryClient();
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false);
  const [tutorialType, setTutorialType] = useState<"video" | "article">("video");
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deleteId, setDeleteId] = useState<{ id: string; type: "tutorial" | "faq" } | null>(null);

  const { data: tutorials = [], isLoading: tutorialsLoading } = useQuery({
    queryKey: ["tutorials-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorials")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Tutorial[];
    },
  });

  const { data: faqItems = [], isLoading: faqLoading } = useQuery({
    queryKey: ["faq-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as FaqItem[];
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, type, published }: { id: string; type: "tutorial" | "faq"; published: boolean }) => {
      const table = type === "tutorial" ? "tutorials" : "faq_items";
      const { error } = await supabase
        .from(table)
        .update({ is_published: published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [type === "tutorial" ? "tutorials-admin" : "faq-admin"] });
      queryClient.invalidateQueries({ queryKey: [type === "tutorial" ? "tutorials-public" : "faq-public"] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "tutorial" | "faq" }) => {
      const table = type === "tutorial" ? "tutorials" : "faq_items";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [type === "tutorial" ? "tutorials-admin" : "faq-admin"] });
      queryClient.invalidateQueries({ queryKey: [type === "tutorial" ? "tutorials-public" : "faq-public"] });
      toast.success("Supprimé avec succès");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const videoTutorials = tutorials.filter((t) => t.type === "video");
  const articleTutorials = tutorials.filter((t) => t.type === "article");

  const handleOpenTutorialDialog = (type: "video" | "article", tutorial?: Tutorial) => {
    setTutorialType(type);
    setEditingTutorial(tutorial || null);
    setTutorialDialogOpen(true);
  };

  const handleOpenFaqDialog = (faq?: FaqItem) => {
    setEditingFaq(faq || null);
    setFaqDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Vidéos ({videoTutorials.length})
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Articles ({articleTutorials.length})
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ ({faqItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tutoriels Vidéo</CardTitle>
              <Button onClick={() => handleOpenTutorialDialog("video")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {tutorialsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : videoTutorials.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun tutoriel vidéo
                </p>
              ) : (
                <div className="space-y-3">
                  {videoTutorials.map((tutorial) => (
                    <div
                      key={tutorial.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="h-12 w-20 rounded bg-muted overflow-hidden flex-shrink-0">
                        {tutorial.thumbnail_url ? (
                          <img
                            src={tutorial.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tutorial.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {tutorial.description || "Pas de description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tutorial.is_published}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({
                              id: tutorial.id,
                              type: "tutorial",
                              published: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenTutorialDialog("video", tutorial)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId({ id: tutorial.id, type: "tutorial" })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Articles</CardTitle>
              <Button onClick={() => handleOpenTutorialDialog("article")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {tutorialsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : articleTutorials.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun article
                </p>
              ) : (
                <div className="space-y-3">
                  {articleTutorials.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="h-12 w-20 rounded bg-muted overflow-hidden flex-shrink-0">
                        {article.thumbnail_url ? (
                          <img
                            src={article.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{article.title}</p>
                          {article.tag && (
                            <Badge variant="secondary" className="flex-shrink-0">
                              {article.tag}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {article.description || "Pas de description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={article.is_published}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({
                              id: article.id,
                              type: "tutorial",
                              published: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenTutorialDialog("article", article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId({ id: article.id, type: "tutorial" })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Questions Fréquentes</CardTitle>
              <Button onClick={() => handleOpenFaqDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {faqLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : faqItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune question FAQ
                </p>
              ) : (
                <div className="space-y-3">
                  {faqItems.map((faq) => (
                    <div
                      key={faq.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{faq.question}</p>
                          {faq.category && (
                            <Badge variant="outline" className="flex-shrink-0">
                              {faq.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {faq.answer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={faq.is_published}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({
                              id: faq.id,
                              type: "faq",
                              published: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenFaqDialog(faq)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId({ id: faq.id, type: "faq" })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tutorial Dialog */}
      <CreateTutorialDialog
        open={tutorialDialogOpen}
        onOpenChange={setTutorialDialogOpen}
        type={tutorialType}
        tutorial={editingTutorial}
      />

      {/* FAQ Dialog */}
      <CreateFaqDialog
        open={faqDialogOpen}
        onOpenChange={setFaqDialogOpen}
        faq={editingFaq}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment supprimer cet élément ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
