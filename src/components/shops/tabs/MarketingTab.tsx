import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Sparkles, Loader2, MoreVertical, BookOpen, Copy, MessageSquare, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddStoryDialog } from "@/components/shops/AddStoryDialog";
import { SendImageDialog } from "@/components/shops/SendImageDialog";
import { ImageViewerModal } from "@/components/shops/ImageViewerModal";

interface MarketingTabProps {
  shopId: string;
}

interface GeneratedImage {
  id: string;
  shop_id: string;
  prompt: string;
  image_url: string;
  model_used: string;
  created_by: string;
  created_at: string;
}

export const MarketingTab = ({ shopId }: MarketingTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [storyImageUrl, setStoryImageUrl] = useState<string | null>(null);
  const [sendImageUrl, setSendImageUrl] = useState<string | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  // Fetch generated images
  const { data: images = [], isLoading: isLoadingImages } = useQuery({
    queryKey: ["generated-images", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeneratedImage[];
    },
    enabled: !!shopId,
  });

  // Generate image mutation
  const generateMutation = useMutation({
    mutationFn: async ({ promptText }: { promptText: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await fetch(
        `https://jajfuajmkjulujnwfqen.supabase.co/functions/v1/generate-marketing-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ prompt: promptText, shopId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération");
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Image générée avec succès !");
      setPrompt("");
      queryClient.invalidateQueries({ queryKey: ["generated-images", shopId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("generated_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Image supprimée");
      setDeleteImageId(null);
      setViewingImageIndex(null);
      queryClient.invalidateQueries({ queryKey: ["generated-images", shopId] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Veuillez décrire l'affiche que vous souhaitez créer");
      return;
    }
    generateMutation.mutate({ promptText: prompt.trim() });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  const handleRefreshStories = () => {
    setStoryImageUrl(null);
    queryClient.invalidateQueries({ queryKey: ["shop-stories", shopId] });
  };

  const viewingImage = viewingImageIndex !== null ? images[viewingImageIndex] : null;

  return (
    <div className="space-y-6">
      {/* Generator Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Générateur d'affiches IA</h3>
          </div>

          <Textarea
            placeholder="Décrivez l'affiche que vous souhaitez créer...\nEx: Affiche promotionnelle pour soldes d'été, style moderne, couleurs vives avec texte 'Soldes -50%'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generateMutation.isPending}
            className="min-h-[100px] resize-none"
          />

          <Button 
            onClick={handleGenerate} 
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full sm:w-auto"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer une affiche
              </>
            )}
          </Button>

          {generateMutation.isPending && (
            <div className="flex items-center justify-center p-8 rounded-lg border border-dashed">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Création de votre affiche en cours...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Mes affiches générées</h3>
            <span className="text-sm text-muted-foreground">({images.length})</span>
          </div>
        </div>

        {isLoadingImages ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune affiche générée</p>
            <p className="text-sm text-muted-foreground">
              Utilisez le générateur ci-dessus pour créer votre première affiche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <Card key={image.id} className="overflow-hidden group cursor-pointer" onClick={() => setViewingImageIndex(index)}>
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStoryImageUrl(image.image_url)}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Créer une Story
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(image.image_url)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copier le lien
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSendImageUrl(image.image_url)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Envoyer par message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteImageId(image.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {image.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(image.created_at), "d MMM yyyy", { locale: fr })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        imageUrl={viewingImage?.image_url || null}
        prompt={viewingImage?.prompt}
        onClose={() => setViewingImageIndex(null)}
        onCreateStory={() => {
          if (viewingImage) {
            setStoryImageUrl(viewingImage.image_url);
            setViewingImageIndex(null);
          }
        }}
        onCopyLink={() => {
          if (viewingImage) {
            handleCopyLink(viewingImage.image_url);
          }
        }}
        onSendMessage={() => {
          if (viewingImage) {
            setSendImageUrl(viewingImage.image_url);
            setViewingImageIndex(null);
          }
        }}
        onDelete={() => {
          if (viewingImage) {
            setDeleteImageId(viewingImage.id);
          }
        }}
        onPrevious={() => setViewingImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
        onNext={() => setViewingImageIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev))}
        hasPrevious={viewingImageIndex !== null && viewingImageIndex > 0}
        hasNext={viewingImageIndex !== null && viewingImageIndex < images.length - 1}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette image ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'image sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteImageId && deleteMutation.mutate(deleteImageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Story Dialog with prefilled image */}
      {storyImageUrl && (
        <AddStoryDialog
          shopId={shopId}
          onSuccess={handleRefreshStories}
          prefilledImageUrl={storyImageUrl}
          open={!!storyImageUrl}
          onOpenChange={(open) => !open && setStoryImageUrl(null)}
        />
      )}

      {/* Send Image Dialog */}
      {sendImageUrl && (
        <SendImageDialog
          imageUrl={sendImageUrl}
          open={!!sendImageUrl}
          onOpenChange={(open) => !open && setSendImageUrl(null)}
        />
      )}
    </div>
  );
};