import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail } from "lucide-react";
import { PhoneInputWithCountry } from "@/components/ui/PhoneInputWithCountry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { phoneSignupSchema, PhoneSignupFormData } from "@/lib/validators";
import OtpVerificationStep from "./OtpVerificationStep";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeFunction } from "@/lib/parseFunctionError";

interface PhoneSignupFormProps {
  onSuccess: () => void;
}

const PhoneSignupForm = ({ onSuccess }: PhoneSignupFormProps) => {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [formData, setFormData] = useState<PhoneSignupFormData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(true);

  const form = useForm<PhoneSignupFormData>({
    resolver: zodResolver(phoneSignupSchema),
    defaultValues: {
      nom_complet: "",
      phone: "+225",
      email: "",
      role: "membre",
      pin: "",
      confirmPin: "",
    },
  });

  const onSubmitForm = async (data: PhoneSignupFormData) => {
    try {
      const result = await invokeFunction(supabase, "phone-auth", {
        action: "register",
        phone: data.phone,
        full_name: data.nom_complet,
        pin: data.pin,
        role: data.role,
        email: data.email || undefined,
      });

      setRegisteredPhone(data.phone);
      setFormData(data);
      setSmsSent(result?.sms_sent !== false);
      setDevOtp(result?.dev_otp || null);
      setStep("otp");
      toast.success(result?.sms_sent === false
        ? "Mode test : le code est affiché ci-dessous"
        : "Code de vérification envoyé par SMS");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription");
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsVerifying(true);
    try {
      await invokeFunction(supabase, "phone-auth", {
        action: "verify-registration",
        phone: registeredPhone,
        otp,
      });

      toast.success("Compte créé avec succès ! Connectez-vous maintenant.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Code de vérification incorrect");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData) return;
    try {
      const result = await invokeFunction(supabase, "phone-auth", {
        action: "register",
        phone: formData.phone,
        full_name: formData.nom_complet,
        pin: formData.pin,
        role: formData.role,
        email: formData.email || undefined,
      });

      setSmsSent(result?.sms_sent !== false);
      setDevOtp(result?.dev_otp || null);

      toast.success(result?.sms_sent === false
        ? "Mode test : nouveau code affiché ci-dessous"
        : "Nouveau code envoyé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du renvoi du code");
    }
  };

  if (step === "otp") {
    return (
      <OtpVerificationStep
        phone={registeredPhone}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onBack={() => setStep("form")}
        isVerifying={isVerifying}
        devOtp={devOtp}
        smsSent={smsSent}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4">
        <FormField
          control={form.control}
          name="nom_complet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} placeholder="Jean Dupont" className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <PhoneInputWithCountry
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-muted-foreground">(optionnel)</span></FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="email" placeholder="email@exemple.com" className="pl-10" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vous êtes</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="membre">Membre</option>
                  <option value="vendeur">Vendeur</option>
                  <option value="livreur">Livreur</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code PIN (6 chiffres)</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmer le PIN</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Inscription..." : "S'inscrire"}
        </Button>
      </form>
    </Form>
  );
};

export default PhoneSignupForm;
