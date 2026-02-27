import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Calendar, Clock, MapPin, Loader2, XCircle, CheckCircle, AlertTriangle, Upload, CreditCard, Ban } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ClientBookingDetailSheetProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientBookingDetailSheet({ booking, open, onOpenChange }: ClientBookingDetailSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [bookingData, setBookingData] = useState(booking);
  
  // Cancellation/partial form state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showPartialForm, setShowPartialForm] = useState(false);
  const [cancelReasonId, setCancelReasonId] = useState("");
  const [cancelComment, setCancelComment] = useState("");
  const [cancelProofUrl, setCancelProofUrl] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  useEffect(() => {
    setBookingData(booking);
    setShowCancelForm(false);
    setShowPartialForm(false);
  }, [booking]);

  // Realtime subscription
  useEffect(() => {
    if (!booking?.id) return;
    const channel = supabase
      .channel(`booking-${booking.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_bookings',
        filter: `id=eq.${booking.id}`,
      }, (payload) => {
        setBookingData((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [booking?.id]);

  // Fetch cancellation reasons for services
  const { data: cancellationReasons = [] } = useQuery({
    queryKey: ["cancellation-reasons-service"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellation_reasons")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data.filter((r: any) => r.applies_to?.includes("service"));
    },
  });

  // Fetch refund info if applicable
  const { data: refundInfo } = useQuery({
    queryKey: ["booking-refund", booking?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!booking?.id && ["cancelled", "expired"].includes(booking?.status),
  });

  if (!bookingData) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0 FCFA";
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
  };

  const status = bookingData.status;
  const totalPrice = bookingData.total_price || 0;
  const travelFee = bookingData.travel_fee || 0;
  const travelFeePaid = bookingData.travel_fee_paid || false;
  const commissionAmount = bookingData.commission_amount || 0;

  // Upload proof file
  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setIsUploadingProof(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/booking-proof-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("cancellation-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("cancellation-attachments")
        .getPublicUrl(path);
      setCancelProofUrl(urlData.publicUrl);
      toast.success("Preuve téléversée");
    } catch (error) {
      toast.error("Erreur lors du téléversement");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Cancel booking (before on_the_way)
  const handleCancelBeforeOnTheWay = async () => {
    setIsUpdating(true);
    try {
      // Update booking status
      const { error } = await supabase
        .from("service_bookings")
        .update({ 
          status: "cancelled",
          cancellation_comment: cancelComment || null,
          cancellation_reason_id: cancelReasonId || null,
          cancellation_proof_url: cancelProofUrl || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", bookingData.id);
      if (error) throw error;

      // If advance was paid, create refund record
      if (travelFeePaid && travelFee > 0) {
        await supabase.from("refunds").insert({
          user_id: user!.id,
          booking_id: bookingData.id,
          amount: travelFee,
          net_refund: travelFee,
          status: "pending",
          refund_status: "pending_manual",
        });
      }

      // Create cancellation record
      await supabase.from("cancellations").insert({
        booking_id: bookingData.id,
        cancelled_by: user!.id,
        canceller_role: "membre",
        reason_id: cancelReasonId || null,
        custom_reason: cancelComment || null,
        attachment_url: cancelProofUrl || null,
        status_at_cancellation: status,
        refund_amount: travelFeePaid && travelFee > 0 ? travelFee : 0,
      });

      setBookingData((prev: any) => ({ ...prev, status: "cancelled" }));
      toast.success("Réservation annulée");
      queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
      setShowCancelForm(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel at arrival (no refund of advance)
  const handleCancelAtArrival = async () => {
    if (!cancelReasonId) {
      toast.error("Veuillez sélectionner un motif d'annulation");
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({
          status: "cancelled",
          completion_type: "cancelled_at_arrival",
          cancellation_comment: cancelComment || null,
          cancellation_reason_id: cancelReasonId || null,
          cancellation_proof_url: cancelProofUrl || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", bookingData.id);
      if (error) throw error;

      await supabase.from("cancellations").insert({
        booking_id: bookingData.id,
        cancelled_by: user!.id,
        canceller_role: "membre",
        reason_id: cancelReasonId || null,
        custom_reason: cancelComment || null,
        attachment_url: cancelProofUrl || null,
        status_at_cancellation: "arrived",
        refund_amount: 0,
        delivery_fee_kept: true,
      });

      setBookingData((prev: any) => ({ ...prev, status: "cancelled", completion_type: "cancelled_at_arrival" }));
      toast.success("Prestation annulée");
      queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
      setShowCancelForm(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Pay 100% or 50% via Orange Money
  const handlePayCompletion = async (percentage: 100 | 50) => {
    setIsUpdating(true);
    try {
      const paymentAmount = percentage === 100 
        ? totalPrice 
        : Math.round(totalPrice * 0.5);

      const response = await supabase.functions.invoke("orange-money-payment", {
        body: {
          action: "initialize",
          amount: paymentAmount,
          email: user?.email,
          payment_type: "service_booking",
          related_id: bookingData.id,
          metadata: {
            service_id: bookingData.service_id,
            completion_type: percentage === 100 ? "full" : "partial",
            percentage,
          },
          return_url: `${window.location.origin}/payment/callback`,
          cancel_url: `${window.location.origin}/mon-profil?tab=orders`,
        },
      });

      if (response.data?.payment_url) {
        sessionStorage.setItem('om_order_id', response.data.order_id);
        sessionStorage.setItem('om_pay_token', response.data.pay_token);
        sessionStorage.setItem('om_payment_type', 'service_booking');
        sessionStorage.setItem('om_booking_id', bookingData.id);
        sessionStorage.setItem('om_completion_type', percentage === 100 ? 'full' : 'partial');

        // If 50%, save cancellation details before redirecting
        if (percentage === 50) {
          await supabase
            .from("service_bookings")
            .update({
              cancellation_reason_id: cancelReasonId || null,
              cancellation_comment: cancelComment || null,
              cancellation_proof_url: cancelProofUrl || null,
            } as any)
            .eq("id", bookingData.id);
        }

        window.location.href = response.data.payment_url;
      } else {
        throw new Error("Erreur d'initialisation du paiement");
      }
    } catch (error: any) {
      toast.error("Erreur de paiement: " + (error.message || "Veuillez réessayer"));
    } finally {
      setIsUpdating(false);
    }
  };

  // Status tracker steps
  const steps = [
    { key: "pending", label: "En attente", icon: Clock },
    { key: "accepted", label: "Acceptée", icon: CheckCircle },
    { key: "on_the_way", label: "En route", icon: MapPin },
    { key: "arrived", label: "Arrivé", icon: MapPin },
    { key: "completed", label: "Terminée", icon: CheckCircle },
  ];

  const statusOrder = ["pending", "accepted", "on_the_way", "arrived", "completed"];
  const currentStepIndex = statusOrder.indexOf(status);
  const isTerminalStatus = ["cancelled", "expired", "partial"].includes(status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            {bookingData.service?.name || "Réservation"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={status} />
            <PaymentStatusBadge status={bookingData.payment_status} />
            {bookingData.completion_type === "partial" && (
              <OrderStatusBadge status="partial" />
            )}
          </div>

          {/* Progress tracker */}
          {!isTerminalStatus && (
            <div className="space-y-1">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isCurrent ? "bg-primary/10" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>{step.label}</span>
                    {isCurrent && <span className="text-xs text-primary ml-auto">En cours</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Terminal status display */}
          {isTerminalStatus && (
            <div className={`p-4 rounded-lg text-center ${status === "cancelled" ? "bg-red-50" : status === "expired" ? "bg-gray-50" : "bg-amber-50"}`}>
              {status === "cancelled" && (
                <>
                  <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="font-medium text-red-800">Prestation annulée</p>
                </>
              )}
              {status === "expired" && (
                <>
                  <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="font-medium text-gray-800">Prestation expirée (non acceptée sous 24h)</p>
                </>
              )}
              {status === "partial" && (
                <>
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-medium text-amber-800">Prestation terminée à 50%</p>
                </>
              )}
            </div>
          )}

          {/* Refund info */}
          {refundInfo && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-800">
                Remboursement en attente : {formatCurrency(refundInfo.net_refund)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {refundInfo.refund_status === "pending_manual"
                  ? "L'admin traitera votre remboursement prochainement."
                  : refundInfo.refund_status === "processed"
                  ? "Remboursement effectué."
                  : "En cours de traitement."}
              </p>
            </div>
          )}

          {/* Date/time */}
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="font-semibold">
              {format(new Date(bookingData.booking_date), "EEEE dd MMMM yyyy", { locale: fr })} à {bookingData.booking_time}
            </p>
          </div>

          <Separator />

          {/* ACTION BUTTONS based on status */}
          <div className="space-y-3">
            {/* Pending/Accepted: can cancel */}
            {["pending", "accepted"].includes(status) && !showCancelForm && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowCancelForm(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Annuler la réservation
              </Button>
            )}

            {/* Cancel form (pending/accepted) */}
            {["pending", "accepted"].includes(status) && showCancelForm && (
              <div className="space-y-3 p-4 border rounded-lg">
                <p className="text-sm font-medium">Confirmer l'annulation</p>
                {travelFeePaid && travelFee > 0 && (
                  <p className="text-sm text-green-600">
                    Votre acompte de {formatCurrency(travelFee)} vous sera remboursé.
                  </p>
                )}
                <Select value={cancelReasonId} onValueChange={setCancelReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motif d'annulation (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationReasons.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  placeholder="Commentaire (optionnel)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCancelForm(false)}>Retour</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleCancelBeforeOnTheWay} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmer
                  </Button>
                </div>
              </div>
            )}

            {/* On the way: no action */}
            {status === "on_the_way" && (
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <MapPin className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-800">Le prestataire est en route</p>
                <p className="text-xs text-blue-600 mt-1">Vous ne pouvez pas annuler pendant que le prestataire est en route.</p>
              </div>
            )}

            {/* Arrived: 3 action buttons */}
            {status === "arrived" && !showCancelForm && !showPartialForm && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Le prestataire est arrivé. Comment souhaitez-vous terminer ?</p>
                <Button className="w-full" onClick={() => handlePayCompletion(100)} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Payer 100% — {formatCurrency(totalPrice)}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowPartialForm(true)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Payer 50% — {formatCurrency(Math.round(totalPrice * 0.5))}
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setShowCancelForm(true)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Annuler la prestation
                </Button>
              </div>
            )}

            {/* Partial payment form */}
            {status === "arrived" && showPartialForm && (
              <div className="space-y-3 p-4 border rounded-lg">
                <p className="text-sm font-medium">Paiement partiel (50%)</p>
                <p className="text-xs text-muted-foreground">Montant : {formatCurrency(Math.round(totalPrice * 0.5))}</p>
                <Select value={cancelReasonId} onValueChange={setCancelReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motif du paiement partiel *" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationReasons.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  placeholder="Commentaire (optionnel)"
                  rows={2}
                />
                <div>
                  <Label className="text-sm">Preuve (optionnel)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="file" accept="image/*,application/pdf" onChange={handleUploadProof} disabled={isUploadingProof} />
                    {isUploadingProof && <Loader2 className="h-4 w-4 animate-spin" />}
                    {cancelProofUrl && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowPartialForm(false)}>Retour</Button>
                  <Button className="flex-1" onClick={() => handlePayCompletion(50)} disabled={isUpdating || !cancelReasonId}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Payer 50%
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel at arrival form */}
            {status === "arrived" && showCancelForm && (
              <div className="space-y-3 p-4 border border-destructive rounded-lg">
                <p className="text-sm font-medium text-destructive">Annuler la prestation</p>
                {travelFeePaid && travelFee > 0 && (
                  <p className="text-sm text-red-600">
                    ⚠️ Votre acompte de {formatCurrency(travelFee)} ne sera pas remboursé.
                  </p>
                )}
                <Select value={cancelReasonId} onValueChange={setCancelReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Motif d'annulation *" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationReasons.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={cancelComment}
                  onChange={(e) => setCancelComment(e.target.value)}
                  placeholder="Commentaire (optionnel)"
                  rows={2}
                />
                <div>
                  <Label className="text-sm">Preuve (optionnel)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={handleUploadProof} className="mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCancelForm(false)}>Retour</Button>
                  <Button variant="destructive" className="flex-1" onClick={handleCancelAtArrival} disabled={isUpdating || !cancelReasonId}>
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmer l'annulation
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Financial summary */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Prix de la prestation</span>
                <span className="font-medium">{formatCurrency(totalPrice)}</span>
              </div>
              {travelFee > 0 && (
                <div className="flex justify-between">
                  <span>Frais de déplacement (acompte)</span>
                  <span className={`font-medium ${travelFeePaid ? "text-green-600" : "text-yellow-600"}`}>
                    {formatCurrency(travelFee)} {travelFeePaid ? "✓" : "(en attente)"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Créée le {format(new Date(bookingData.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
            {bookingData.auto_cancel_at && status === "pending" && (
              <p className="text-orange-600">
                Expire le {format(new Date(bookingData.auto_cancel_at), "dd MMM yyyy à HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}