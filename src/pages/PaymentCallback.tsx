import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentStatus = 'loading' | 'success' | 'failed' | 'abandoned' | 'error';

interface PaymentResult {
  status: PaymentStatus;
  reference: string;
  amount?: number;
  currency?: string;
  message?: string;
  paymentType?: string;
}

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<PaymentResult>({
    status: 'loading',
    reference: '',
  });

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || 
                       searchParams.get('trxref') || 
                       sessionStorage.getItem('paystack_reference');

      if (!reference) {
        setResult({
          status: 'error',
          reference: '',
          message: 'Référence de paiement non trouvée',
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('paystack-payment', {
          body: {
            action: 'verify',
            reference,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        const paymentType = data.metadata?.payment_type || 
                           sessionStorage.getItem('paystack_payment_type') || 'order';
        
        setResult({
          status: data.status as PaymentStatus,
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          paymentType,
        });

        // Clear session storage
        sessionStorage.removeItem('paystack_reference');
        sessionStorage.removeItem('paystack_payment_type');
        sessionStorage.removeItem('paystack_related_id');
        sessionStorage.removeItem('paystack_user_id');

      } catch (error: any) {
        setResult({
          status: 'error',
          reference: reference,
          message: error.message || 'Erreur lors de la vérification du paiement',
        });
      }
    };

    verifyPayment();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (result.status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'abandoned':
        return <AlertCircle className="h-16 w-16 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusTitle = () => {
    switch (result.status) {
      case 'loading': return 'Vérification du paiement...';
      case 'success':
        return result.paymentType === 'order_balance' 
          ? 'Solde payé avec succès !' 
          : 'Acompte payé avec succès !';
      case 'failed': return 'Paiement échoué';
      case 'abandoned': return 'Paiement abandonné';
      case 'error': return 'Erreur';
      default: return '';
    }
  };

  const getStatusDescription = () => {
    switch (result.status) {
      case 'loading':
        return 'Veuillez patienter pendant que nous vérifions votre paiement...';
      case 'success':
        if (result.paymentType === 'order_balance') {
          return `Votre solde de ${result.amount?.toLocaleString()} ${result.currency} a été payé. La commande est maintenant livrée !`;
        }
        return `Votre acompte de ${result.amount?.toLocaleString()} ${result.currency} a été payé. Vous paierez le solde à la livraison.`;
      case 'failed':
        return 'Votre paiement n\'a pas pu être traité. Veuillez réessayer.';
      case 'abandoned':
        return 'Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.';
      case 'error':
        return result.message || 'Une erreur est survenue lors de la vérification du paiement.';
      default:
        return '';
    }
  };

  const handleContinue = () => {
    navigate('/mon-profil?tab=orders');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-base">
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.reference && (
            <div className="bg-muted p-3 rounded-md text-center">
              <p className="text-sm text-muted-foreground">Référence</p>
              <p className="font-mono text-sm">{result.reference}</p>
            </div>
          )}
          
          {result.status !== 'loading' && (
            <div className="flex flex-col gap-2">
              <Button onClick={handleContinue} className="w-full">
                Voir mes commandes
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
