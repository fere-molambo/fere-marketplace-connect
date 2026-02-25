import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";

interface DriverCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: any;
  userId: string;
}

export function DriverCancellationDialog({
  open,
  onOpenChange,
  delivery,
  userId,
}: DriverCancellationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>En attente du client</DialogTitle>
          <DialogDescription>
            Le client doit vérifier le colis et effectuer le paiement du solde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {delivery?.driver_earnings > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">
                Vos gains pour cette livraison : {new Intl.NumberFormat("fr-FR").format(delivery.driver_earnings)} FCFA
              </p>
            </div>
          )}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm">En attente de vérification</p>
              <p className="text-amber-600 text-sm mt-1">
                Le client va vérifier le colis puis payer le solde via Orange Money. 
                La livraison sera automatiquement marquée comme terminée après le paiement.
              </p>
              <p className="text-amber-600 text-sm mt-1">
                Si le client annule, un retour du colis au vendeur sera initié.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
