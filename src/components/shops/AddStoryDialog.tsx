import { useState } from "react";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const storySchema = z.object({
  caption: z.string().optional(),
  duration: z.number().min(24).max(168), // 24h to 7 days in hours
  visibility: z.enum(["public", "clients_only", "private"]),
  mediaUrl: z.string().optional(),
});

type StoryFormData = z.infer<typeof storySchema>;

interface AddStoryDialogProps {
  shopId: string;
  onSuccess: () => void;
}

export const AddStoryDialog = ({ shopId, onSuccess }: AddStoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const form = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      caption: "",
      duration: 24,
      visibility: "public",
      mediaUrl: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast.error("Format non supporté. Utilisez JPG, PNG, WEBP, MP4 ou WEBM");
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 50MB)");
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: StoryFormData) => {
    setIsUploading(true);
    try {
      let mediaUrl = data.mediaUrl || "";
      let mediaType = "image";
      let sourceType = "link";

      // Upload file if present
      if (selectedFile) {
        sourceType = "upload";
        mediaType = selectedFile.type.startsWith("video") ? "video" : "image";

        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${shopId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("shop-stories")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("shop-stories")
          .getPublicUrl(filePath);

        mediaUrl = publicUrlData.publicUrl;
      } else if (data.mediaUrl) {
        // Determine media type from URL
        mediaType = data.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" : "image";
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + data.duration);

      // Insert story
      const { error } = await supabase.from("shop_stories").insert({
        shop_id: shopId,
        media_url: mediaUrl,
        media_type: mediaType,
        source_type: sourceType,
        caption: data.caption || null,
        visibility: data.visibility,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("Story ajoutée avec succès");
      setOpen(false);
      form.reset();
      setSelectedFile(null);
      setPreviewUrl("");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating story:", error);
      toast.error(error.message || "Erreur lors de l'ajout de la story");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ajouter une story</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une story</DialogTitle>
          <DialogDescription>
            Partagez un moment avec vos clients
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="link">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Lien
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Image ou Vidéo</FormLabel>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {previewUrl && (
                    <div className="mt-2 rounded-lg border p-2">
                      {selectedFile?.type.startsWith("video") ? (
                        <video src={previewUrl} className="h-40 w-full rounded object-cover" controls />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="h-40 w-full rounded object-cover" />
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="link" className="space-y-4">
                <FormField
                  control={form.control}
                  name="mediaUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lien de l'image ou vidéo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          disabled={isUploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Légende (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ajoutez une description..."
                      {...field}
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée de publication</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                    disabled={isUploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="24">24 heures</SelectItem>
                      <SelectItem value="48">2 jours</SelectItem>
                      <SelectItem value="72">3 jours</SelectItem>
                      <SelectItem value="168">7 jours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibilité</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isUploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="clients_only">Mes clients uniquement</SelectItem>
                      <SelectItem value="private">Privé (lien uniquement)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUploading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publier
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
