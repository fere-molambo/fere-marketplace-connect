import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, Image, Mic, Square, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string | undefined, mediaUrl: string | undefined, mediaType: "text" | "image" | "audio") => void;
  conversationId: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, conversationId, disabled }: MessageInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!content.trim() && !uploadedImageUrl) return;

    if (uploadedImageUrl) {
      onSend(content.trim() || undefined, uploadedImageUrl, "image");
      setUploadedImageUrl(null);
      setPreviewImage(null);
    } else {
      onSend(content.trim(), undefined, "text");
    }
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedData, error: signError } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signError) throw signError;

      setUploadedImageUrl(signedData.signedUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléversement");
      setPreviewImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported audio format for cross-browser compatibility
      let mimeType = '';
      let fileExtension = 'webm';
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        fileExtension = 'm4a';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        fileExtension = 'ogg';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
        fileExtension = 'wav';
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        stream.getTracks().forEach((track) => track.stop());

        // Upload audio
        if (audioBlob.size > 0 && user?.id) {
          setIsUploading(true);
          try {
            const filePath = `${user.id}/${conversationId}/${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
              .from("chat-media")
              .upload(filePath, audioBlob);

            if (uploadError) throw uploadError;

            const { data: signedData, error: signError } = await supabase.storage
              .from("chat-media")
              .createSignedUrl(filePath, 60 * 60 * 24 * 365);

            if (signError) throw signError;

            onSend(undefined, signedData.signedUrl, "audio");
          } catch (error) {
            console.error("Audio upload error:", error);
            toast.error("Erreur lors de l'envoi de l'audio");
          } finally {
            setIsUploading(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelImage = () => {
    setPreviewImage(null);
    setUploadedImageUrl(null);
  };

  return (
    <div className="space-y-2">
      {/* Image preview */}
      {previewImage && (
        <div className="relative inline-block">
          <img
            src={previewImage}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-lg"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={cancelImage}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || isUploading || isRecording}
        >
          <Image className="h-5 w-5" />
        </Button>

        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            disabled={disabled || isRecording}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
        </div>

        {content.trim() || uploadedImageUrl ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        ) : (
          <Button
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isUploading}
          >
            {isRecording ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
          Enregistrement en cours...
        </div>
      )}
    </div>
  );
}
