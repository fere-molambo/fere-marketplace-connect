import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OrangeMoneyCheckoutProps {
  amount: number; // Amount in FCFA (integer, no x100)
  email: string;
  paymentType: 'order' | 'service_booking' | 'subscription' | 'commission_payout';
  relatedId?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonClassName?: string;
  disabled?: boolean;
}

export function PaystackCheckout({
  amount,
  email,
  paymentType,
  relatedId,
  metadata,
  onSuccess,
  onCancel,
  buttonText = "Payer maintenant",
  buttonVariant = "default",
  buttonClassName,
  disabled = false,
}: OrangeMoneyCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (amount <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({
        title: "Erreur",
        description: "L'email est requis pour le paiement",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour effectuer un paiement",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('orange-money-payment', {
        body: {
          action: 'initialize',
          amount,
          email,
          payment_type: paymentType,
          related_id: relatedId,
          metadata,
          return_url: `${window.location.origin}/payment/callback`,
          cancel_url: `${window.location.origin}${window.location.pathname}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'initialisation du paiement');
      }

      // Store for callback verification
      sessionStorage.setItem('om_order_id', data.order_id);
      sessionStorage.setItem('om_pay_token', data.pay_token);
      sessionStorage.setItem('om_payment_type', paymentType);

      // Redirect to Orange Money payment page
      window.location.href = data.payment_url;

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors du paiement",
        variant: "destructive",
      });
      onCancel?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      variant={buttonVariant}
      className={buttonClassName}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}