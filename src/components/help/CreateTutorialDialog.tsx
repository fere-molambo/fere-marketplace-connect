import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

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
}

interface CreateTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "video" | "article";
  tutorial: Tutorial | null;
}

export function CreateTutorialDialog({
  open,
  onOpenChange,
  type,
  tutorial,
}: CreateTutorialDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (tutorial) {
      setTitle(tutorial.title);
      setDescription(tutorial.description || "");
      setThumbnailUrl(tutorial.thumbnail_url || "");
      setVideoUrl(tutorial.video_url || "");
      setContent(tutorial.content || "");
      setTag(tutorial.tag || "");
    } else {
      setTitle("");
      setDescription("");
      setThumbnailUrl("");
      setVideoUrl("");
      setContent("");
      setTag("");
    }
  }, [tutorial, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 50) + "-" + Date.now();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const slug = tutorial?.slug || generateSlug(title);
      const data = {
        type,
        title,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        video_url: type === "video" ? videoUrl || null : null,
        content: type === "article" ? content || null : null,
        tag: type === "article" ? tag || null : null,
        slug,
        is_published: tutorial?.is_published ?? false,
      };

      if (tutorial) {
        const { error } = await supabase
          .from("tutorials")
          .update(data)
          .eq("id", tutorial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tutorials").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutorials-admin"] });
      queryClient.invalidateQueries({ queryKey: ["tutorials-public"] });
      toast.success(tutorial ? "Tutoriel modifié" : "Tutoriel créé");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `thumbnails/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("tutorial-media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("tutorial-media")
        .getPublicUrl(path);

      setThumbnailUrl(urlData.publicUrl);
      toast.success("Image uploadée");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tutorial ? "Modifier" : "Créer"} un{" "}
            {type === "video" ? "tutoriel vidéo" : "article"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du tutoriel"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte"
              rows={2}
            />
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            {thumbnailUrl ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setThumbnailUrl("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Upload en cours..." : "Cliquez pour uploader"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Video URL (for video type) */}
          {type === "video" && (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">URL de la vidéo *</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... ou URL directe"
              />
              <p className="text-xs text-muted-foreground">
                Supporte YouTube, Vimeo ou lien direct vers une vidéo
              </p>
            </div>
          )}

          {/* Article fields */}
          {type === "article" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tag">Tag / Catégorie</Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="ex: Démarrage, Configuration..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu de l'article *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Contenu de l'article (supporte le Markdown basique)"
                  rows={10}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez ## pour les titres, **texte** pour le gras, *texte* pour l'italique
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!title || (type === "video" && !videoUrl) || mutation.isPending}
            >
              {mutation.isPending ? "Enregistrement..." : tutorial ? "Modifier" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
