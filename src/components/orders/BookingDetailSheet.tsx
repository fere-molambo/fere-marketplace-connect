import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { CancellationBanner } from "./CancellationBanner";
import { MapPin, Phone, Calendar, Clock, MessageSquare, Banknote, CreditCard, ExternalLink, CheckCircle, Play, CircleDollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface BookingDetailSheetProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

export function BookingDetailSheet({ booking, open, onOpenChange, shopId }: BookingDetailSheetProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  // Local state to reflect updates immediately
  const [bookingData, setBookingData] = useState(booking);

  // Sync local state when prop changes
  useEffect(() => {
    setBookingData(booking);
  }, [booking]);

  // Fetch cancellation details if booking is cancelled
  const { data: cancellation } = useQuery({
    queryKey: ["booking-cancellation", booking?.id],
    queryFn: async () => {
      if (!booking?.id) return null;
      const { data, error } = await supabase
        .from("cancellations")
        .select(`
          *,
          reason:cancellation_reasons(label)
        `)
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!booking?.id && booking?.status === "cancelled",
  });

  if (!bookingData) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 FCFA";
    }
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

      // Update local state immediately for reactive UI
      setBookingData((prev: any) => ({
        ...prev,
        status: newStatus,
        ...additionalFields,
      }));

      toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
      queryClient.invalidateQueries({ queryKey: ["shop-bookings", shopId] });
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      toast.error("Erreur lors de la mise à jour: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingData.id);

      if (error) throw error;

      // Update local state immediately
      setBookingData((prev: any) => ({
        ...prev,
        payment_status: "paid",
      }));

      toast.success("Paiement marqué comme reçu");
      queryClient.invalidateQueries({ queryKey: ["shop-bookings", shopId] });
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error("Erreur lors de la mise à jour: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "reserved": return "Réservé";
      case "on_the_way": return "En route";
      case "arrived": return "Arrivé";
      case "completed": return "Réalisé";
      case "cancelled": return "Annulé";
      // Legacy statuses
      case "pending": return "En attente";
      case "confirmed": return "Confirmée";
      case "in_progress": return "En cours";
      default: return status;
    }
  };

  const handleValidateTravelFee = async () => {
    if (!bookingData.travel_fee || !bookingData.travel_fee_paid) return;
    // Travel fee already paid at booking - create pending payout for vendor
    try {
      const { data: shop } = await supabase
        .from("services")
        .select("shop_id, shops(owner_id)")
        .eq("id", bookingData.service_id)
        .single();
      
      if (shop?.shops?.owner_id) {
        await supabase.from("pending_payouts").insert({
          recipient_id: shop.shops.owner_id,
          recipient_type: "vendor",
          booking_id: bookingData.id,
          amount: bookingData.travel_fee,
          status: "pending",
          eligible_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error creating travel fee payout:", error);
    }
  };

  // Calculate amounts using local state
  const totalPrice = bookingData.total_price || 0;
  const commissionAmount = bookingData.commission_amount || 0;
  const tvaAmount = bookingData.tva_amount || 0;
  const travelFee = bookingData.travel_fee || 0;
  const travelFeePaid = bookingData.travel_fee_paid || false;
  const vendorNet = totalPrice - commissionAmount - tvaAmount;

  // Build Google Maps link from delivery address
  const deliveryAddress = bookingData.delivery_address;
  const mapsLink = deliveryAddress?.geolocation_lat && deliveryAddress?.geolocation_lng
    ? `https://www.google.com/maps?q=${deliveryAddress.geolocation_lat},${deliveryAddress.geolocation_lng}`
    : deliveryAddress?.google_maps_link || null;

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
          {/* Statuts et badges */}
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={bookingData.status} />
            <PaymentStatusBadge status={bookingData.payment_status} />
            {bookingData.payment_method === "cash" ? (
              <Badge variant="secondary">
                <Banknote className="mr-1 h-3 w-3" />Cash
              </Badge>
            ) : (
              <Badge variant="secondary">
                <CreditCard className="mr-1 h-3 w-3" />En ligne
              </Badge>
            )}
          </div>

          {/* Cancellation Banner */}
          {bookingData.status === "cancelled" && cancellation && (
            <CancellationBanner 
              cancellation={cancellation} 
              type="booking"
            />
          )}

          {/* Date et heure du RDV */}
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

          {/* Boutons d'action selon le nouveau workflow simplifié */}
          <div className="space-y-2">
            {/* RESERVED -> ON_THE_WAY */}
            {bookingData.status === "reserved" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("on_the_way", { vendor_on_the_way_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Je suis en route
              </Button>
            )}
            
            {/* ON_THE_WAY -> ARRIVED */}
            {bookingData.status === "on_the_way" && (
              <Button 
                className="w-full" 
                onClick={async () => {
                  await handleStatusUpdate("arrived", { vendor_arrived_at: new Date().toISOString() });
                  // Validate travel fee payment if applicable
                  if (bookingData.travel_fee_paid) {
                    await handleValidateTravelFee();
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Je suis arrivé
              </Button>
            )}
            
            {/* ARRIVED -> COMPLETED */}
            {bookingData.status === "arrived" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("completed")}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Service terminé
              </Button>
            )}

            {/* Legacy status support */}
            {bookingData.status === "pending" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("reserved", { vendor_confirmed_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Accepter la réservation
              </Button>
            )}
            {bookingData.status === "confirmed" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("on_the_way", { vendor_on_the_way_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Je suis en route
              </Button>
            )}
            {bookingData.status === "in_progress" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("arrived", { vendor_arrived_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Je suis arrivé
              </Button>
            )}
            
            {/* Cancellation button - available before completion */}
            {!["cancelled", "completed"].includes(bookingData.status) && (
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={isUpdating}
              >
                Annuler la réservation
              </Button>
            )}
          </div>

          <Separator />

          {/* Infos client */}
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

          {/* Lieu d'intervention */}
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
                {deliveryAddress.recipient_name && (
                  <p className="text-sm">{deliveryAddress.recipient_name} - {deliveryAddress.recipient_phone}</p>
                )}
                {mapsLink && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => window.open(mapsLink, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir sur Google Maps
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes du client */}
          {bookingData.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Notes du client</h3>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm whitespace-pre-wrap">{bookingData.notes}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Récapitulatif financier - simplifié pour le vendeur */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif financier</h3>
            <div className="space-y-3 text-sm">
              {/* Service price - to collect in cash */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex justify-between font-medium text-orange-700">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    À encaisser en espèces
                  </span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <p className="text-xs text-orange-600 mt-1">Le client paie le service en cash le jour J</p>
              </div>

              {/* Travel fee - if applicable */}
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
                    {travelFeePaid 
                      ? "✓ Payé en ligne - vous recevrez ce montant après votre arrivée"
                      : "⏳ En attente de paiement par le client"}
                  </p>
                </div>
              )}
              
              <Separator />
              
              {/* Net vendor earnings */}
              <div className="flex justify-between font-semibold text-lg text-green-600">
                <span>💰 Vous conserverez (net)</span>
                <span>{formatCurrency(vendorNet)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission plateforme ({((commissionAmount / totalPrice) * 100).toFixed(0)}%) déduite de vos tokens
              </p>
            </div>
          </div>

          {/* Confirmations */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {bookingData.vendor_confirmed_at && (
              <p>✓ Acceptée le {format(new Date(bookingData.vendor_confirmed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            {bookingData.client_confirmed_at && (
              <p>✓ Confirmée par client le {format(new Date(bookingData.client_confirmed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
          </div>

          {/* Date de création */}
          <div className="text-xs text-muted-foreground">
            Créée le {format(new Date(bookingData.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
