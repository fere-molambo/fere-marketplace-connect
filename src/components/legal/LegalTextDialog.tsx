import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchLegalTexts, type LegalDocKey } from "@/lib/consent";

interface LegalTextDialogProps {
  document: LegalDocKey | null;
  onClose: () => void;
}

const TITLES: Record<LegalDocKey, string> = {
  cgu: "Conditions générales d'utilisation",
  privacy: "Politique de confidentialité",
  cookies: "Politique de cookies",
};

/**
 * Les textes sont stockes en markdown leger dans platform_settings.
 * On evite une dependance de rendu markdown pour trois marqueurs.
 */
function renderMarkdown(source: string) {
  return source.split("\n").map((rawLine, index) => {
    const line = rawLine.trimEnd();

    if (!line.trim()) return <div key={index} className="h-2" />;

    if (line.startsWith("### ")) {
      return (
        <h4 key={index} className="mt-3 text-sm font-semibold text-foreground">
          {line.slice(4)}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={index} className="mt-5 text-base font-semibold text-foreground">
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={index} className="mt-2 text-lg font-bold text-foreground">
          {line.slice(2)}
        </h2>
      );
    }

    const bold = /^\*\*(.+)\*\*$/.exec(line.trim());
    if (bold) {
      return (
        <p key={index} className="text-sm font-medium text-foreground">
          {bold[1]}
        </p>
      );
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={index} className="ml-4 list-disc text-sm text-muted-foreground">
          {line.slice(2)}
        </li>
      );
    }

    return (
      <p key={index} className="text-sm leading-relaxed text-muted-foreground">
        {line.replace(/\*\*/g, "")}
      </p>
    );
  });
}

const LegalTextDialog = ({ document, onClose }: LegalTextDialogProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;

    setLoading(true);
    fetchLegalTexts()
      .then((texts) => {
        if (cancelled) return;
        setContent(texts[document]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [document]);

  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document ? TITLES[document] : ""}</DialogTitle>
          <DialogDescription className="sr-only">
            Texte intégral du document légal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-1">{renderMarkdown(content)}</div>
          </ScrollArea>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Ce document n'est pas encore disponible. Contactez-nous à privacy@fere.com.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LegalTextDialog;
