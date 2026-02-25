import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Coins, CreditCard } from "lucide-react";

interface BuyTokensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000];

export const BuyTokensDialog = ({ open, onOpenChange, onSuccess }: BuyTokensDialogProps) => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getFinalAmount = () => {
    if (selectedAmount) return selectedAmount;
    const parsed = parseInt(customAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handlePurchase = async () => {
    const amount = getFinalAmount();
    
    if (amount < 1000) {
      toast.error("Le montant minimum est de 1 000 FCFA");
      return;
    }

    if (!user?.id || !user?.email) {
      toast.error("Vous devez être connecté");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('orange-money-payment', {
        body: {
          action: 'initialize',
          amount,
          email: user.email,
          payment_type: 'tokens',
          metadata: { type: 'tokens', user_id: user.id },
          return_url: `${window.location.origin}/payment/callback`,
          cancel_url: `${window.location.origin}/dashboard/transactions`,
        },
      });

      if (error) throw error;

      if (data?.payment_url) {
        sessionStorage.setItem('om_order_id', data.order_id);
        sessionStorage.setItem('om_pay_token', data.pay_token);
        sessionStorage.setItem('om_payment_type', 'tokens');
        
        window.location.href = data.payment_url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (error: any) {
      console.error("Token purchase error:", error);
      toast.error(error.message || "Erreur lors de l'achat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Acheter des tokens
          </DialogTitle>
          <DialogDescription>
            Les tokens servent à couvrir les commissions sur les paiements en espèces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset amounts */}
          <div className="space-y-2">
            <Label>Montants suggérés</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className="h-12"
                  onClick={() => handleAmountSelect(amount)}
                >
                  {amount.toLocaleString()} FCFA
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Ou entrez un montant personnalisé</Label>
            <div className="relative">
              <Input
                id="custom-amount"
                type="number"
                placeholder="Ex: 15000"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                min={1000}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                FCFA
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Minimum: 1 000 FCFA</p>
          </div>

          {/* Summary */}
          {getFinalAmount() > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total à payer</span>
                <span className="text-xl font-bold text-primary">
                  {getFinalAmount().toLocaleString()} FCFA
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                = {getFinalAmount().toLocaleString()} tokens
              </p>
            </div>
          )}

          {/* Pay button */}
          <Button 
            onClick={handlePurchase} 
            disabled={isLoading || getFinalAmount() < 1000}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Payer avec Orange Money
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
