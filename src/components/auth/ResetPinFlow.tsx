import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInputWithCountry } from "@/components/ui/PhoneInputWithCountry";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeFunction } from "@/lib/parseFunctionError";

interface ResetPinFlowProps {
  onBack: () => void;
}

type Step = "phone" | "otp" | "new-pin";

const ResetPinFlow = ({ onBack }: ResetPinFlowProps) => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+225");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    setLoading(true);
    try {
      const data = await invokeFunction(supabase, "phone-auth", { action: "reset-pin-request", phone });
      toast.success(data.message || "Code envoyé par SMS");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (newPin !== confirmPin) {
      toast.error("Les PIN ne correspondent pas");
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      toast.error("Le PIN doit contenir 6 chiffres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-auth", {
        body: { action: "reset-pin-confirm", phone, otp, new_pin: newPin },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error);
      toast.success(data.message || "PIN réinitialisé avec succès");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la connexion
      </button>

      <h3 className="text-lg font-semibold text-foreground">Réinitialiser mon PIN</h3>

      {step === "phone" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Entrez votre numéro de téléphone pour recevoir un code de vérification par SMS.
          </p>
          <PhoneInputWithCountry value={phone} onChange={setPhone} />
          <Button onClick={handleRequestOtp} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Envoyer le code
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Entrez le code reçu par SMS, puis choisissez un nouveau PIN.
          </p>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Code OTP</label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          {otp.length === 6 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Nouveau PIN (6 chiffres)</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Confirmer le PIN</label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={confirmPin} onChange={setConfirmPin}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button onClick={handleVerifyAndReset} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Réinitialiser le PIN
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ResetPinFlow;
