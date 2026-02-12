import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Banknote, AlertTriangle, Undo2 } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"choice" | "cancel_options" | "cancel_confirmation">("choice");

  // Diagnostic log
  console.log("DriverCancellationDialog - payment_method:", delivery?.order?.payment_method, "isOnlinePayment:", delivery?.order?.payment_method === "online");

  const paymentMethod = delivery?.order?.payment_method;
  const isOnlinePayment = paymentMethod === "online";

  // Confirm delivery mutation
  const confirmDelivery = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("delivery_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
        .eq("driver_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Livraison confirmée !");
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Confirm delivery error:", error);
      toast.error("Erreur lors de la confirmation");
    },
  });

  // Cancel delivery mutation
  const cancelDelivery = useMutation({
    mutationFn: async ({ clientPaidDelivery }: { clientPaidDelivery: boolean }) => {
      // 1. Create cancellation record
      const { data: cancellation, error: cancelError } = await supabase
        .from("cancellations")
        .insert({
          order_id: delivery.order_id,
          cancelled_by: userId,
          canceller_role: "driver",
          status_at_cancellation: delivery.status,
          custom_reason: "Annulation par livreur à la demande du client",
          delivery_fee_kept: clientPaidDelivery,
        })
        .select()
        .single();

      if (cancelError) throw cancelError;

      // 2. Update delivery request to returning
      const { error: deliveryError } = await supabase
        .from("delivery_requests")
        .update({
          status: "cancelled",
          return_status: "returning",
        })
        .eq("id", delivery.id)
        .eq("driver_id", userId);

      if (deliveryError) throw deliveryError;

      // 3. Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancellation_id: cancellation.id,
        })
        .eq("id", delivery.order_id);

      if (orderError) throw orderError;

      // 4. If online payment, create refund record (without delivery fee)
      if (isOnlinePayment) {
        const order = delivery.order;
        const refundAmount = order.subtotal; // Product value only
        const deliveryFeeKept = delivery.delivery_fee || 0;

        await supabase.from("refunds").insert({
          order_id: delivery.order_id,
          user_id: order.user_id,
          amount: order.total_amount,
          net_refund: refundAmount,
          transaction_fee_deducted: deliveryFeeKept,
          original_payment_reference: order.payment_reference,
          status: "pending",
          refund_status: "pending",
          cancellation_id: cancellation.id,
        });
      }

      // 5. For cash - if client didn't pay delivery, create penalty
      if (!isOnlinePayment && !clientPaidDelivery) {
        const deliveryFee = delivery.delivery_fee || 0;
        await supabase.from("client_penalties").insert({
          user_id: delivery.order.user_id,
          amount: deliveryFee,
          reason: "Frais de livraison non payés lors du refus de colis",
          source_order_id: delivery.order_id,
          source_delivery_id: delivery.id,
          status: "pending",
        });
      }

      return { clientPaidDelivery };
    },
    onSuccess: ({ clientPaidDelivery }) => {
      const message = isOnlinePayment
        ? "Commande annulée. Remboursement en cours (hors frais de livraison)."
        : clientPaidDelivery
          ? "Commande annulée. Livraison payée."
          : "Commande annulée. Livraison non payée.";
      
      toast.success(message, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      onOpenChange(false);
      setStep("choice");
    },
    onError: (error: any) => {
      const msg = error?.message || error?.details || "Erreur inconnue";
      console.error("Cancel delivery error:", error);
      toast.error(`Erreur lors de l'annulation : ${msg}`, { duration: 8000 });
    },
  });

  const isPending = confirmDelivery.isPending || cancelDelivery.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStep("choice"); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmation de livraison</DialogTitle>
          <DialogDescription>
            Vous êtes arrivé chez le client. Que souhaitez-vous faire ?
          </DialogDescription>
        </DialogHeader>

        {step === "choice" && (
          <div className="space-y-4 pt-4">
            {/* Driver earnings display */}
            {delivery?.driver_earnings > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Vos gains pour cette livraison : {new Intl.NumberFormat("fr-FR").format(delivery.driver_earnings)} FCFA
                </p>
              </div>
            )}

            {/* Alerte vérification */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Le client doit vérifier le colis avant acceptation
              </p>
            </div>

            <Separator />

            {/* Bouton confirmer livraison */}
            <Button
              onClick={() => confirmDelivery.mutate()}
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {confirmDelivery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isOnlinePayment ? "Client accepte - Confirmer livraison" : "Cash reçu - Confirmer livraison"}
            </Button>

            {/* Bouton annuler */}
            <Button
              variant="destructive"
              onClick={() => {
                if (isOnlinePayment) {
                  setStep("cancel_confirmation");
                } else {
                  setStep("cancel_options");
                }
              }}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Client refuse - Annuler
            </Button>
          </div>
        )}

        {/* Step pour commandes prépayées - confirmation directe */}
        {step === "cancel_confirmation" && (
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium flex items-center gap-2">
                <Undo2 className="h-4 w-4" />
                Vous devrez retourner le colis au vendeur
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Le client sera remboursé du montant des produits. Les frais de livraison seront retenus.
            </p>

            <Button
              variant="destructive"
              onClick={() => cancelDelivery.mutate({ clientPaidDelivery: true })}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {cancelDelivery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmer l'annulation
            </Button>

            <Button
              variant="ghost"
              onClick={() => setStep("choice")}
              disabled={isPending}
              className="w-full"
            >
              Retour
            </Button>
          </div>
        )}

        {/* Step pour commandes cash uniquement */}
        {step === "cancel_options" && (
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium flex items-center gap-2">
                <Undo2 className="h-4 w-4" />
                Vous devrez retourner le colis au vendeur
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Le client a-t-il payé les frais de livraison ?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => cancelDelivery.mutate({ clientPaidDelivery: true })}
                disabled={isPending}
                className="flex-col h-auto py-4"
              >
                {cancelDelivery.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mb-1" />
                ) : (
                  <Banknote className="h-5 w-5 mb-1 text-green-600" />
                )}
                <span className="text-xs">Annulé, livraison payée</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelDelivery.mutate({ clientPaidDelivery: false })}
                disabled={isPending}
                className="flex-col h-auto py-4"
              >
                {cancelDelivery.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mb-1" />
                ) : (
                  <XCircle className="h-5 w-5 mb-1" />
                )}
                <span className="text-xs">Annulé, livraison non payée</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => setStep("choice")}
              disabled={isPending}
              className="w-full"
            >
              Retour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
