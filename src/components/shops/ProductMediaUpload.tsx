import { useState } from "react";
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductMediaUploadProps {
  shopId: string;
  onMainMediaChange: (url: string) => void;
  onHoverMediaChange: (url: string) => void;
  onVideoChange: (url: string) => void;
  onOtherMediaChange: (urls: string[]) => void;
  bucketName: "product-media" | "service-media";
}

export const ProductMediaUpload = ({
  shopId,
  onMainMediaChange,
  onHoverMediaChange,
  onVideoChange,
  onOtherMediaChange,
  bucketName,
}: ProductMediaUploadProps) => {
  const { toast } = useToast();
  const [mainMedia, setMainMedia] = useState<string>("");
  const [hoverMedia, setHoverMedia] = useState<string>("");
  const [video, setVideo] = useState<string>("");
  const [otherMedia, setOtherMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, type: "main" | "hover" | "video" | "other") => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${shopId}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (type === "main") {
        setMainMedia(publicUrl);
        onMainMediaChange(publicUrl);
      } else if (type === "hover") {
        setHoverMedia(publicUrl);
        onHoverMediaChange(publicUrl);
      } else if (type === "video") {
        setVideo(publicUrl);
        onVideoChange(publicUrl);
      } else if (type === "other") {
        const newOtherMedia = [...otherMedia, publicUrl];
        setOtherMedia(newOtherMedia);
        onOtherMediaChange(newOtherMedia);
      }

      toast({
        title: "Succès",
        description: "Média téléchargé avec succès",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: "Échec du téléchargement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeOtherMedia = (index: number) => {
    const newOtherMedia = otherMedia.filter((_, i) => i !== index);
    setOtherMedia(newOtherMedia);
    onOtherMediaChange(newOtherMedia);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image principale *</Label>
        <div className="flex items-center gap-4">
          {mainMedia && (
            <img src={mainMedia} alt="Principal" className="h-20 w-20 object-cover rounded" />
          )}
          <Button type="button" variant="outline" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {mainMedia ? "Changer" : "Télécharger"}
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "main")}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Image hover (optionnel)</Label>
        <div className="flex items-center gap-4">
          {hoverMedia && (
            <img src={hoverMedia} alt="Hover" className="h-20 w-20 object-cover rounded" />
          )}
          <Button type="button" variant="outline" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <ImageIcon className="h-4 w-4 mr-2" />
              {hoverMedia ? "Changer" : "Télécharger"}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "hover")}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vidéo (optionnel)</Label>
        <div className="flex items-center gap-4">
          {video && (
            <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
              <Video className="h-8 w-8" />
            </div>
          )}
          <Button type="button" variant="outline" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <Video className="h-4 w-4 mr-2" />
              {video ? "Changer" : "Télécharger"}
              <input
                type="file"
                className="hidden"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "video")}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Autres images (max 10)</Label>
        <div className="grid grid-cols-4 gap-2">
          {otherMedia.map((url, index) => (
            <div key={index} className="relative group">
              <img src={url} alt={`Autre ${index + 1}`} className="h-20 w-20 object-cover rounded" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => removeOtherMedia(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {otherMedia.length < 10 && (
            <Button type="button" variant="outline" disabled={uploading} asChild className="h-20 w-20">
              <label className="cursor-pointer flex flex-col items-center justify-center">
                <Upload className="h-4 w-4 mb-1" />
                <span className="text-xs">Ajouter</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "other")}
                />
              </label>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
