import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { CancellationBanner } from "./CancellationBanner";
import { MapPin, Phone, Calendar, Clock, MessageSquare, CreditCard, ExternalLink, CheckCircle, Play, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface BookingDetailSheetProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

export function BookingDetailSheet({ booking, open, onOpenChange, shopId }: BookingDetailSheetProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [bookingData, setBookingData] = useState(booking);
  const [vendorComment, setVendorComment] = useState("");

  useEffect(() => {
    setBookingData(booking);
    setVendorComment(booking?.vendor_dispute_comment || "");
  }, [booking]);

  const { data: cancellation } = useQuery({
    queryKey: ["booking-cancellation", booking?.id],
    queryFn: async () => {
      if (!booking?.id) return null;
      const { data, error } = await supabase
        .from("cancellations")
        .select(`*, reason:cancellation_reasons(label)`)
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!booking?.id && (booking?.status === "cancelled" || booking?.status === "partial"),
  });

  if (!bookingData) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0 FCFA";
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
  };

  const handleStatusUpdate = async (newStatus: string, additionalFields?: Record<string, any>) => {
    setIsUpdating(true);
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalFields,
      };

      const { error } = await supabase
        .from("service_bookings")
        .update(updateData)
        .eq("id", bookingData.id);

      if (error) throw error;

      setBookingData((prev: any) => ({ ...prev, status: newStatus, ...additionalFields }));
      toast.success(`Statut mis à jour`);
      queryClient.invalidateQueries({ queryKey: ["shop-bookings", shopId] });
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveVendorComment = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({ vendor_dispute_comment: vendorComment } as any)
        .eq("id", bookingData.id);
      if (error) throw error;
      toast.success("Commentaire enregistré");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPrice = bookingData.total_price || 0;
  const commissionAmount = bookingData.commission_amount || 0;
  const tvaAmount = bookingData.tva_amount || 0;
  const travelFee = bookingData.travel_fee || 0;
  const travelFeePaid = bookingData.travel_fee_paid || false;
  const vendorNet = totalPrice - commissionAmount - tvaAmount;

  const deliveryAddress = bookingData.delivery_address;
  const mapsLink = deliveryAddress?.geolocation_lat && deliveryAddress?.geolocation_lng
    ? `https://www.google.com/maps?q=${deliveryAddress.geolocation_lat},${deliveryAddress.geolocation_lng}`
    : deliveryAddress?.google_maps_link || null;

  const status = bookingData.status;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Réservation - {bookingData.service?.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={status} />
            <PaymentStatusBadge status={bookingData.payment_status} />
          </div>

          {/* Cancellation Banner */}
          {(status === "cancelled" || status === "partial") && cancellation && (
            <CancellationBanner cancellation={cancellation} type="booking" />
          )}

          {/* Date et heure */}
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Rendez-vous prévu</p>
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(bookingData.booking_date), "EEEE dd MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {bookingData.booking_time}
            </p>
          </div>

          {/* Action buttons - vendor workflow */}
          <div className="space-y-2">
            {status === "pending" && (
              <Button
                className="w-full"
                onClick={() => handleStatusUpdate("accepted", { 
                  accepted_by: user?.id, 
                  accepted_at: new Date().toISOString() 
                })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Accepter la prestation
              </Button>
            )}

            {status === "accepted" && (
              <Button
                className="w-full"
                onClick={() => handleStatusUpdate("on_the_way", { started_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Démarrer vers client
              </Button>
            )}

            {status === "on_the_way" && (
              <Button
                className="w-full"
                onClick={() => handleStatusUpdate("arrived", { arrived_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Je suis arrivé
              </Button>
            )}

            {status === "arrived" && (
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800">En attente de l'action du client</p>
                <p className="text-xs text-amber-600 mt-1">Le client doit confirmer la fin de la prestation et effectuer le paiement.</p>
              </div>
            )}

            {/* Vendor comment for disputes (completed/partial/cancelled) */}
            {["completed", "partial", "cancelled"].includes(status) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Commentaire vendeur (litiges)</label>
                <Textarea
                  value={vendorComment}
                  onChange={(e) => setVendorComment(e.target.value)}
                  placeholder="Ajoutez un commentaire pour l'admin si besoin..."
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveVendorComment}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                  Enregistrer le commentaire
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Client info */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Client</h3>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="font-medium">{bookingData.customer?.nom_complet || "—"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {bookingData.customer?.contact || "—"}
              </p>
              {bookingData.customer?.email && (
                <p className="text-sm text-muted-foreground">{bookingData.customer.email}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {deliveryAddress && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Lieu d'intervention</h3>
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <p className="font-medium">{deliveryAddress.label}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {deliveryAddress.address}
                </p>
                {deliveryAddress.city && (
                  <p className="text-sm text-muted-foreground">{deliveryAddress.city}, {deliveryAddress.country || "Mali"}</p>
                )}
                {mapsLink && (
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open(mapsLink, "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir sur Google Maps
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {bookingData.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Notes du client</h3>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm whitespace-pre-wrap">{bookingData.notes}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Financial summary */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif financier</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between font-medium">
                  <span>Prix de la prestation</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Payé via Orange Money par le client à l'arrivée
                </p>
              </div>

              {travelFee > 0 && (
                <div className={`p-3 rounded-lg ${travelFeePaid ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className={`flex justify-between font-medium ${travelFeePaid ? 'text-green-700' : 'text-yellow-700'}`}>
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Frais de déplacement
                    </span>
                    <span>{formatCurrency(travelFee)}</span>
                  </div>
                  <p className={`text-xs mt-1 ${travelFeePaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {travelFeePaid ? "✓ Payé en ligne" : "⏳ En attente de paiement"}
                  </p>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-semibold text-lg text-green-600">
                <span>💰 Vous recevrez (net)</span>
                <span>{formatCurrency(vendorNet)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission plateforme déduite. L'admin effectuera le versement.
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {bookingData.accepted_at && (
              <p>✓ Acceptée le {format(new Date(bookingData.accepted_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            {bookingData.started_at && (
              <p>✓ Démarré le {format(new Date(bookingData.started_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            {bookingData.arrived_at && (
              <p>✓ Arrivé le {format(new Date(bookingData.arrived_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            {bookingData.completed_at && (
              <p>✓ Terminée le {format(new Date(bookingData.completed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            <p className="pt-1">Créée le {format(new Date(bookingData.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}