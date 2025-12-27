import { TokenBalanceCard } from "@/components/tokens/TokenBalanceCard";
import { TokenHistoryTable } from "@/components/tokens/TokenHistoryTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const DriverTokensSection = () => {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Comment fonctionnent les tokens ?</AlertTitle>
        <AlertDescription>
          Lorsque vous livrez une commande payée en espèces, la commission de la plateforme est 
          déduite de votre solde de tokens. Assurez-vous d'avoir suffisamment de tokens pour 
          accepter les livraisons en cash.
        </AlertDescription>
      </Alert>

      <TokenBalanceCard 
        title="Mes tokens livreur"
        description="Solde pour accepter les livraisons en cash"
      />

      <TokenHistoryTable />
    </div>
  );
};
