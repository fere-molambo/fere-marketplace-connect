import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  acceptConsents,
  fetchConsentState,
  isConsentComplete,
  type LegalDocKey,
} from "@/lib/consent";
import LegalTextDialog from "./LegalTextDialog";

/**
 * Barriere de consentement pour les comptes crees avant la mise en place des
 * CGU, et pour toute nouvelle version des documents. Tant que l'utilisateur
 * n'a pas accepte, la boite ne peut pas etre fermee : refuser deconnecte.
 */
const ConsentGate = () => {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [cguChecked, setCguChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);

  const check = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setNeedsConsent(false);
      return;
    }
    const state = await fetchConsentState();
    if (!isConsentComplete(state)) {
      setCguChecked(false);
      setPrivacyChecked(false);
      setNeedsConsent(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) check(data.session?.user?.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setNeedsConsent(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        check(session?.user?.id);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [check]);

  const handleAccept = async () => {
    setError(null);
    setSubmitting(true);
    const ok = await acceptConsents();
    setSubmitting(false);

    if (ok) {
      setNeedsConsent(false);
    } else {
      setError("Impossible d'enregistrer votre acceptation. Vérifiez votre connexion.");
    }
  };

  const handleRefuse = async () => {
    setNeedsConsent(false);
    await supabase.auth.signOut();
  };

  if (!needsConsent) return null;

  const canAccept = cguChecked && privacyChecked && !submitting;

  return (
    <>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>

          <DialogTitle>Mise à jour de nos conditions</DialogTitle>
          <DialogDescription>
            Pour continuer à utiliser FERE, vous devez prendre connaissance et accepter nos
            conditions générales d'utilisation ainsi que notre politique de confidentialité.
          </DialogDescription>

          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={cguChecked}
                onCheckedChange={(v) => setCguChecked(v === true)}
                disabled={submitting}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                J'ai lu et j'accepte les{" "}
                <button
                  type="button"
                  onClick={() => setOpenDoc("cgu")}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  conditions générales d'utilisation
                </button>
                <span className="ml-1 text-destructive">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={privacyChecked}
                onCheckedChange={(v) => setPrivacyChecked(v === true)}
                disabled={submitting}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                J'ai lu et j'accepte la{" "}
                <button
                  type="button"
                  onClick={() => setOpenDoc("privacy")}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  politique de confidentialité
                </button>
                <span className="ml-1 text-destructive">*</span>
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Ces boutons doivent rester dans un conteneur : la regle
              [&>button]:hidden, qui masque la croix de fermeture, cachait aussi
              tout bouton enfant direct de la fenetre — les utilisateurs se
              retrouvaient bloques sans aucun moyen d'accepter. */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleAccept} disabled={!canAccept} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accepter et continuer"}
            </Button>

            <button
              type="button"
              onClick={handleRefuse}
              disabled={submitting}
              className="text-sm text-muted-foreground hover:underline"
            >
              Refuser et se déconnecter
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <LegalTextDialog document={openDoc} onClose={() => setOpenDoc(null)} />
    </>
  );
};

export default ConsentGate;
