import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MultiVendorWarningProps {
  shopCount: number;
}

export function MultiVendorWarning({ shopCount }: MultiVendorWarningProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Commande multi-vendeurs</AlertTitle>
      <AlertDescription>
        Votre panier contient des produits de {shopCount} boutiques différentes. 
        Chaque vendeur recevra sa partie de la commande et les livraisons seront effectuées séparément.
        Pour un retrait en boutique, vous pourrez récupérer vos produits dans chaque boutique concernée.
      </AlertDescription>
    </Alert>
  );
}