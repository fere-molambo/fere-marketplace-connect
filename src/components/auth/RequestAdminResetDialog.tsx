import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInputWithCountry } from "@/components/ui/PhoneInputWithCountry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeFunction } from "@/lib/parseFunctionError";

const RequestAdminResetDialog = () => {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("+225");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    setLoading(true);
    try {
      const data = await invokeFunction(supabase, "phone-auth", { action: "request-admin-reset", phone });
      toast.success(data.message || "Demande envoyée");
      setOpen(false);
      setPhone("+225");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ShieldCheck className="h-3 w-3" />
          Demander à un admin
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demande de réinitialisation par un admin</DialogTitle>
          <DialogDescription>
            Un administrateur réinitialisera votre PIN manuellement. Vous serez contacté une fois le PIN réinitialisé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <PhoneInputWithCountry value={phone} onChange={setPhone} />
          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Envoyer la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestAdminResetDialog;
