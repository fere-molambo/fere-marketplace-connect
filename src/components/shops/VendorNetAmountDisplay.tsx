import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";

interface VendorNetAmountDisplayProps {
  price: string;
  priceType: string;
  minAutoPrice?: string;
  categoryId?: string;
  isService?: boolean;
}

export const VendorNetAmountDisplay = ({
  price,
  priceType,
  minAutoPrice,
  categoryId,
  isService = false,
}: VendorNetAmountDisplayProps) => {
  // Fetch commission rate based on category or global
  const { data: commissionRate = 10 } = useQuery({
    queryKey: ["commission-rate", categoryId, isService],
    queryFn: async () => {
      // First try to find category-specific commission
      if (categoryId && !isService) {
        const { data: catCommission } = await supabase
          .from("category_commissions")
          .select("commission_rate")
          .eq("category_id", categoryId)
          .single();
        
        if (catCommission) {
          return catCommission.commission_rate;
        }
      }

      // Otherwise get global commission (where category_id and service_type_id are both null)
      const { data: globalCommission } = await supabase
        .from("category_commissions")
        .select("commission_rate")
        .is("category_id", null)
        .is("service_type_id", null)
        .single();

      return globalCommission?.commission_rate || 10;
    },
  });

  const priceValue = parseFloat(price) || 0;
  const minAutoPriceValue = parseFloat(minAutoPrice || "") || 0;

  if (priceValue <= 0) return null;

  const netAmount = priceValue * (1 - commissionRate / 100);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Info className="h-4 w-4" />
        <span>Estimation de vos revenus</span>
      </div>
      
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prix affiché :</span>
          <span className="font-medium">{priceValue.toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission ({commissionRate}%) :</span>
          <span className="text-destructive">- {(priceValue * commissionRate / 100).toLocaleString()} FCFA</span>
        </div>
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="font-medium">Vous recevrez :</span>
          <span className="font-bold text-primary">{netAmount.toLocaleString()} FCFA</span>
        </div>
      </div>

      {priceType === "negoce" && minAutoPriceValue > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed text-sm">
          <p className="text-muted-foreground text-xs mb-1">Si le client négocie au prix minimum :</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prix négocié ({minAutoPriceValue.toLocaleString()} FCFA) :</span>
            <span className="font-medium text-primary">
              {(minAutoPriceValue * (1 - commissionRate / 100)).toLocaleString()} FCFA
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
