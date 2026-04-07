import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface ShopImageUploadProps {
  shopId: string;
  currentImageUrl: string | null;
  imageType: "logo" | "banner";
  onUploadComplete: () => void;
}

export const ShopImageUpload = ({
  shopId,
  currentImageUrl,
  imageType,
  onUploadComplete,
}: ShopImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploading(true);

    try {
      const bucket = imageType === "logo" ? "shop-logos" : "shop-banners";
      const fileExt = file.name.split(".").pop();
      const filePath = `${shopId}/${imageType}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Add cache-buster to force browser refresh
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update shop record
      const updateField = imageType === "logo" ? "logo_url" : "banner_url";
      const { error: updateError } = await supabase
        .from("shops")
        .update({ [updateField]: urlWithCacheBuster })
        .eq("id", shopId);

      if (updateError) throw updateError;

      toast.success(`${imageType === "logo" ? "Logo" : "Bannière"} mise à jour avec succès`);
      onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (imageType === "logo") {
    return (
      <div className="relative inline-block">
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt="Logo"
            className="h-16 w-16 rounded-lg border-4 border-background object-cover sm:h-20 sm:w-20"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg border-4 border-background bg-muted sm:h-20 sm:w-20" />
        )}
        <Button
          size="icon"
          variant="secondary"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      {currentImageUrl ? (
        <img
          src={currentImageUrl}
          alt="Bannière"
          className="h-32 w-full rounded-lg object-cover sm:h-48"
        />
      ) : (
        <div className="h-32 w-full rounded-lg bg-muted sm:h-48" />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <Button
          size="lg"
          variant="secondary"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Téléchargement...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Modifier la bannière
            </>
          )}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
