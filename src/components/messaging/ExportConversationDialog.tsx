import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExportConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function ExportConversationDialog({
  open,
  onOpenChange,
  conversationId,
}: ExportConversationDialogProps) {
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["export-messages", conversationId],
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          media_type,
          media_url,
          status,
          created_at,
          sender_id,
          profiles:sender_id(nom_complet)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return msgs;
    },
    enabled: open,
  });

  const handleExport = () => {
    if (!messages) return;

    setIsExporting(true);

    const exportData = messages.map((m) => ({
      id: m.id,
      sender: (m.profiles as any)?.nom_complet || "Inconnu",
      content: m.content,
      type: m.media_type,
      media_url: m.media_url,
      status: m.status,
      date: format(new Date(m.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr }),
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportFormat === "json") {
      content = JSON.stringify(exportData, null, 2);
      filename = `conversation-${conversationId}-${Date.now()}.json`;
      mimeType = "application/json";
    } else {
      // CSV
      const headers = ["ID", "Expéditeur", "Contenu", "Type", "URL Média", "Statut", "Date"];
      const rows = exportData.map((d) => [
        d.id,
        d.sender,
        d.content?.replace(/"/g, '""') || "",
        d.type,
        d.media_url || "",
        d.status,
        d.date,
      ]);

      content =
        headers.join(",") +
        "\n" +
        rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      filename = `conversation-${conversationId}-${Date.now()}.csv`;
      mimeType = "text/csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter la conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format d'export</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as "json" | "csv")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal cursor-pointer">
                  JSON
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">
                  CSV
                </Label>
              </div>
            </RadioGroup>
          </div>

          {messages && (
            <p className="text-sm text-muted-foreground">
              {messages.length} message{messages.length > 1 ? "s" : ""} sera
              {messages.length > 1 ? "ont" : ""} exporté{messages.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !messages}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
