import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Upload, X } from "lucide-react";

interface RequestCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  deliveryRequest?: any; // For specific sub-delivery cancellation
  type: "order" | "booking";
  bookingId?: string;
}

export function RequestCancellationDialog({
  open,
  onOpenChange,
  order,
  deliveryRequest,
  type,
  bookingId,
}: RequestCancellationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch cancellation reasons
  const { data: reasons = [] } = useQuery({
    queryKey: ["cancellation-reasons", type],
    queryFn: async () => {
      const appliesTo = type === "order" ? "product" : "service";
      const { data, error } = await supabase
        .from("cancellation_reasons")
        .select("*")
        .eq("is_active", true)
        .contains("applies_to", [appliesTo])
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const selectedReason = reasons.find((r) => r.id === selectedReasonId);
  const isOtherReason = selectedReason?.label === "Autre";

  // Determine cancellation eligibility and refund info
  const getStatusInfo = () => {
    const status = deliveryRequest?.status || "pending";
    
    const statusOrder = ["pending", "assigned", "in_progress", "picked_up", "en_route_client", "arrived", "delivered"];
    const currentIndex = statusOrder.indexOf(status);
    const pickedUpIndex = statusOrder.indexOf("picked_up");
    
    if (status === "delivered" || status === "cancelled") {
      return {
        canCancel: false,
        warning: "Cette commande ne peut plus être annulée.",
        refundType: "none" as const,
      };
    }
    
    if (currentIndex >= pickedUpIndex) {
      return {
        canCancel: true,
        warning: "Le colis a déjà été récupéré. Les frais de livraison ne seront pas remboursés.",
        refundType: "product_only" as const,
      };
    }
    
    return {
      canCancel: true,
      warning: null,
      refundType: "full" as const,
    };
  };

  const statusInfo = type === "order" && order?.delivery_type === "delivery" 
    ? getStatusInfo() 
    : { canCancel: true, warning: null, refundType: "full" as const };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 5 Mo");
        return;
      }
      setAttachmentFile(file);
    }
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachmentFile || !user?.id) return null;
    
    setIsUploading(true);
    try {
      const ext = attachmentFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error } = await supabase.storage
        .from("identity-documents")
        .upload(path, attachmentFile);
      
      if (error) throw error;
      
      const { data } = supabase.storage
        .from("identity-documents")
        .getPublicUrl(path);
      
      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Create cancellation mutation
  const createCancellation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Non authentifié");
      if (!selectedReasonId) throw new Error("Veuillez sélectionner un motif");
      if (isOtherReason && !customReason.trim()) {
        throw new Error("Veuillez préciser le motif");
      }

      // Upload attachment if present
      const attachmentUrl = await uploadAttachment();

      // Calculate refund amounts based on what was actually paid
      const advanceAmount = order?.advance_amount || 0;
      const refundAmount = statusInfo.refundType === "full" 
        ? advanceAmount 
        : 0; // After pickup: advance covers delivery+commission, no refund
      
      const deliveryFeeKept = statusInfo.refundType === "product_only";
      const requiresReturn = deliveryRequest?.status && 
        ["picked_up", "en_route_client", "arrived"].includes(deliveryRequest.status);

      // Insert cancellation record
      const { data: cancellation, error: cancellationError } = await supabase
        .from("cancellations")
        .insert({
          order_id: type === "order" ? order.id : null,
          booking_id: type === "booking" ? bookingId : null,
          cancelled_by: user.id,
          canceller_role: "client",
          reason_id: selectedReasonId,
          custom_reason: isOtherReason ? customReason : null,
          attachment_url: attachmentUrl,
          status_at_cancellation: deliveryRequest?.status || order?.status || "pending",
          refund_amount: refundAmount,
          delivery_fee_kept: deliveryFeeKept,
          requires_return: requiresReturn,
        })
        .select()
        .single();

      if (cancellationError) throw cancellationError;

      // Update order/booking status
      if (type === "order") {
        const { data: updatedOrder, error: orderError } = await supabase
          .from("orders")
          .update({ 
            status: "cancelled", 
            cancellation_id: cancellation.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", order.id)
          .select()
          .single();

        if (orderError || !updatedOrder) {
          // Rollback: delete cancellation record
          await supabase.from("cancellations").delete().eq("id", cancellation.id);
          throw new Error("Impossible de mettre à jour la commande. Veuillez réessayer.");
        }

        // If cancelled after pickup/arrived, handle return + payout BEFORE cancelling delivery
        if (requiresReturn && deliveryRequest) {
          // 1. Mark original delivery with return_status BEFORE cancellation (RLS allows update when not cancelled)
          const { error: returnStatusError } = await supabase
            .from("delivery_requests")
            .update({ return_status: "returning" })
            .eq("id", deliveryRequest.id);

          if (returnStatusError) {
            console.error("Error setting return_status:", returnStatusError);
          }

          // 2. Cancel the original delivery
          const { error: deliveryError } = await supabase
            .from("delivery_requests")
            .update({ status: "cancelled" })
            .eq("order_id", order.id)
            .eq("is_return", false)
            .neq("status", "delivered");

          if (deliveryError) {
            console.error("Error cancelling deliveries:", deliveryError);
          }

          // 3. Build descriptive label for the return delivery
          const pickupPoints = deliveryRequest.pickup_points as any[] || [];
          const shopName = pickupPoints[0]?.shop_name || "Vendeur";
          const returnLabel = `Retour colis ${order.order_number} vers ${shopName}`;

          // Create return delivery with same driver, status en_route_vendor
          const returnPickupPoint = {
            ...(deliveryRequest.delivery_point || {}),
            label: returnLabel,
          };

          const { error: returnError } = await supabase.from("delivery_requests").insert({
            order_id: order.id,
            is_return: true,
            original_delivery_id: deliveryRequest.id,
            driver_id: deliveryRequest.driver_id,
            pickup_point: returnPickupPoint,
            delivery_point: deliveryRequest.pickup_point,
            zone_id: deliveryRequest.zone_id,
            status: "en_route_vendor",
            assigned_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
          });

          if (returnError) {
            console.error("Error creating return delivery:", returnError);
          }

          // 4. Create driver payout
          const driverEarnings = deliveryRequest.driver_earnings || 0;
          if (driverEarnings > 0 && deliveryRequest.driver_id) {
            const { error: payoutError } = await supabase.from("pending_payouts").insert({
              recipient_id: deliveryRequest.driver_id,
              recipient_type: "driver",
              amount: driverEarnings,
              order_id: order.id,
              delivery_request_id: deliveryRequest.id,
              eligible_at: new Date().toISOString(),
            });

            if (payoutError) {
              console.error("Error creating driver payout:", payoutError);
            }
          }
        } else {
          // No return needed - just cancel all deliveries
          const { error: deliveryError } = await supabase
            .from("delivery_requests")
            .update({ status: "cancelled" })
            .eq("order_id", order.id)
            .neq("status", "delivered");

          if (deliveryError) {
            console.error("Error cancelling deliveries:", deliveryError);
          }
        }

        // Create refund record if advance was paid
        if (["paid", "partial"].includes(order.payment_status)) {
          const paidAmount = order.advance_amount || 0;
          const netRefund = statusInfo.refundType === "full" ? paidAmount : 0;

          if (paidAmount > 0) {
            await supabase.from("refunds").insert({
              order_id: order.id,
              user_id: user.id,
              amount: paidAmount,
              net_refund: netRefund,
              transaction_fee_deducted: statusInfo.refundType === "product_only" ? paidAmount : 0,
              original_payment_reference: order.payment_reference,
              status: "pending",
              refund_status: "pending",
              cancellation_id: cancellation.id,
            });
          }
        }
      } else if (type === "booking" && bookingId) {
        const { data: updatedBooking, error: bookingError } = await supabase
          .from("service_bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId)
          .select()
          .single();

        if (bookingError || !updatedBooking) {
          // Rollback: delete cancellation record
          await supabase.from("cancellations").delete().eq("id", cancellation.id);
          throw new Error("Impossible de mettre à jour la réservation. Veuillez réessayer.");
        }
      }

      return { cancellation, refundAmount };
    },
    onSuccess: (data) => {
      const refundMessage = data.refundAmount > 0 
        ? ` Remboursement de ${data.refundAmount.toLocaleString()} FCFA en cours de traitement.`
        : "";
      toast.success(`Annulation confirmée.${refundMessage}`, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["client-orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-requests"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });

  const resetForm = () => {
    setSelectedReasonId("");
    setCustomReason("");
    setAttachmentFile(null);
  };

  const handleSubmit = () => {
    createCancellation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une annulation</DialogTitle>
          <DialogDescription>
            {type === "order" 
              ? `Commande ${order?.order_number}`
              : "Réservation de service"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning if already picked up */}
          {statusInfo.warning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{statusInfo.warning}</AlertDescription>
            </Alert>
          )}

          {!statusInfo.canCancel ? (
            <p className="text-center text-muted-foreground py-4">
              Cette commande ne peut plus être annulée car elle a déjà été livrée.
            </p>
          ) : (
            <>
              {/* Reason selector */}
              <div className="space-y-2">
                <Label htmlFor="reason">Motif d'annulation *</Label>
                <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom reason textarea */}
              {isOtherReason && (
                <div className="space-y-2">
                  <Label htmlFor="customReason">Précisez le motif *</Label>
                  <Textarea
                    id="customReason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous souhaitez annuler..."
                    rows={3}
                  />
                </div>
              )}

              {/* Attachment upload */}
              <div className="space-y-2">
                <Label>Pièce jointe (optionnel)</Label>
                {attachmentFile ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm truncate">{attachmentFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAttachmentFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Ajouter une photo (max 5 Mo)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Refund info */}
              {statusInfo.refundType !== "none" && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">Remboursement prévu :</p>
              {statusInfo.refundType === "full" ? (
                    <p className="text-muted-foreground">
                      Remboursement de l'acompte payé ({new Intl.NumberFormat("fr-FR").format(order?.advance_amount || 0)} FCFA)
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Aucun remboursement (l'acompte couvre les frais de livraison et commissions)
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {statusInfo.canCancel && (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={createCancellation.isPending || isUploading || !selectedReasonId}
            >
              {(createCancellation.isPending || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmer l'annulation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
