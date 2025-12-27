import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, Loader2 } from "lucide-react";
import { BuyTokensDialog } from "./BuyTokensDialog";
import { useState } from "react";

interface TokenBalanceCardProps {
  title?: string;
  description?: string;
}

export const TokenBalanceCard = ({ 
  title = "Solde de tokens",
  description = "Les tokens sont nécessaires pour les paiements en cash"
}: TokenBalanceCardProps) => {
  const { user } = useAuth();
  const [showBuyDialog, setShowBuyDialog] = useState(false);

  const { data: tokenBalance, isLoading, refetch } = useQuery({
    queryKey: ["user-tokens", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.balance || 0;
    },
    enabled: !!user?.id,
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>{tokenBalance?.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">FCFA</span></>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Disponible pour les commissions
              </p>
            </div>
            <Button onClick={() => setShowBuyDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Acheter
            </Button>
          </div>
        </CardContent>
      </Card>

      <BuyTokensDialog 
        open={showBuyDialog} 
        onOpenChange={setShowBuyDialog}
        onSuccess={() => refetch()}
      />
    </>
  );
};
