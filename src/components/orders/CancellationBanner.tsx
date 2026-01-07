import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { XCircle, Image, Package, ArrowRight, CheckCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CancellationBannerProps {
  cancellation: {
    id: string;
    cancelled_by: string;
    canceller_role: string;
    reason?: { label: string } | null;
    custom_reason?: string | null;
    attachment_url?: string | null;
    refund_amount?: number;
    penalty_amount?: number;
    delivery_fee_kept?: boolean;
    requires_return?: boolean;
    created_at: string;
  };
  returnStatus?: string | null;
  type?: "order" | "booking";
}

export function CancellationBanner({ cancellation, returnStatus, type = "order" }: CancellationBannerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const getCancellerLabel = (role: string) => {
    switch (role) {
      case "client": return "le client";
      case "driver": return "le livreur";
      case "vendor": return "le vendeur";
      case "admin": return "un administrateur";
      default: return role;
    }
  };

  const getReturnStatusLabel = (status: string) => {
    switch (status) {
      case "en_route_vendor": return "En route vers le vendeur";
      case "arrived_vendor": return "Arrivé chez le vendeur";
      case "returned": return "Retourné au vendeur";
      default: return status;
    }
  };

  const getReturnStatusStep = (status: string) => {
    switch (status) {
      case "en_route_vendor": return 1;
      case "arrived_vendor": return 2;
      case "returned": return 3;
      default: return 0;
    }
  };

  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-red-700 font-semibold">
        <XCircle className="h-5 w-5" />
        {type === "order" ? "COMMANDE ANNULÉE" : "RÉSERVATION ANNULÉE"}
      </div>
      
      <div className="text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Motif :</span>{" "}
          <span className="font-medium">{cancellation.reason?.label || cancellation.custom_reason || "Non spécifié"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Annulée par :</span>{" "}
          {getCancellerLabel(cancellation.canceller_role)}
        </p>
        <p>
          <span className="text-muted-foreground">Date :</span>{" "}
          {format(new Date(cancellation.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
        </p>
        
        {cancellation.attachment_url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.open(cancellation.attachment_url!, "_blank")}
          >
            <Image className="mr-2 h-4 w-4" />
            Voir la pièce jointe
          </Button>
        )}
      </div>
      
      {/* Conséquences financières */}
      {((cancellation.refund_amount ?? 0) > 0 || 
        cancellation.delivery_fee_kept || 
        (cancellation.penalty_amount ?? 0) > 0) && (
        <>
          <Separator />
          <div className="text-sm space-y-1">
            {(cancellation.refund_amount ?? 0) > 0 && (
              <p className="text-green-600 flex items-center gap-1">
                💰 Remboursé : {formatCurrency(cancellation.refund_amount!)}
              </p>
            )}
            {cancellation.delivery_fee_kept && (
              <p className="text-orange-600 flex items-center gap-1">
                🚚 Frais de livraison non remboursés
              </p>
            )}
            {(cancellation.penalty_amount ?? 0) > 0 && (
              <p className="text-red-600 flex items-center gap-1">
                ⚠️ Pénalité appliquée : {formatCurrency(cancellation.penalty_amount!)}
              </p>
            )}
          </div>
        </>
      )}
      
      {/* Retour en cours */}
      {cancellation.requires_return && type === "order" && (
        <>
          <Separator />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-700 flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              RETOUR EN COURS
            </p>
            <div className="flex items-center justify-between text-xs">
              <div className={`flex flex-col items-center ${getReturnStatusStep(returnStatus || "") >= 1 ? "text-blue-600" : "text-muted-foreground"}`}>
                <Truck className="h-5 w-5 mb-1" />
                <span>En route</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex flex-col items-center ${getReturnStatusStep(returnStatus || "") >= 2 ? "text-blue-600" : "text-muted-foreground"}`}>
                <Package className="h-5 w-5 mb-1" />
                <span>Arrivé</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex flex-col items-center ${getReturnStatusStep(returnStatus || "") >= 3 ? "text-green-600" : "text-muted-foreground"}`}>
                <CheckCircle className="h-5 w-5 mb-1" />
                <span>Retourné</span>
              </div>
            </div>
            {returnStatus && (
              <p className="text-center mt-2 text-sm font-medium text-blue-700">
                {getReturnStatusLabel(returnStatus)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
