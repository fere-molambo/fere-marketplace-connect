import { TokenBalanceCard } from "@/components/tokens/TokenBalanceCard";
import { TokenHistoryTable } from "@/components/tokens/TokenHistoryTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const VendorTokensSection = () => {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Comment fonctionnent les tokens ?</AlertTitle>
        <AlertDescription>
          Lorsqu'un client paie un service en espèces, la commission de la plateforme est 
          déduite de votre solde de tokens lors de la confirmation. Assurez-vous d'avoir 
          suffisamment de tokens pour confirmer les services payés en cash.
        </AlertDescription>
      </Alert>

      <TokenBalanceCard 
        title="Tokens de ma boutique"
        description="Solde pour confirmer les services payés en cash"
      />

      <TokenHistoryTable />
    </div>
  );
};
