import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { MapPin, Phone, Calendar, Clock, MessageSquare, Banknote, CreditCard, ExternalLink, CheckCircle, Play, CircleDollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BookingDetailSheetProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

export function BookingDetailSheet({ booking, open, onOpenChange, shopId }: BookingDetailSheetProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!booking) return null;

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
        .eq("id", booking.id);

      if (error) throw error;

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
        .eq("id", booking.id);

      if (error) throw error;

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
      case "pending": return "En attente";
      case "confirmed": return "Confirmée";
      case "in_progress": return "En cours";
      case "completed": return "Terminée";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  // Calculate amounts
  const totalPrice = booking.total_price || 0;
  const commissionAmount = booking.commission_amount || 0;
  const tvaAmount = booking.tva_amount || 0;
  const advancePaid = booking.advance_paid || 0;
  const vendorNet = totalPrice - commissionAmount - tvaAmount;
  const remainingToPay = totalPrice - advancePaid;

  // Build Google Maps link from delivery address
  const deliveryAddress = booking.delivery_address;
  const mapsLink = deliveryAddress?.geolocation_lat && deliveryAddress?.geolocation_lng
    ? `https://www.google.com/maps?q=${deliveryAddress.geolocation_lat},${deliveryAddress.geolocation_lng}`
    : deliveryAddress?.google_maps_link || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Réservation - {booking.service?.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Statuts et badges */}
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.payment_status} />
            {booking.payment_method === "cash" ? (
              <Badge variant="secondary">
                <Banknote className="mr-1 h-3 w-3" />Cash
              </Badge>
            ) : (
              <Badge variant="secondary">
                <CreditCard className="mr-1 h-3 w-3" />En ligne
              </Badge>
            )}
          </div>

          {/* Date et heure du RDV */}
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Rendez-vous prévu</p>
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(booking.booking_date), "EEEE dd MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-lg font-semibold flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {booking.booking_time}
            </p>
          </div>

          {/* Boutons d'action selon le statut */}
          <div className="space-y-2">
            {booking.status === "pending" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("confirmed", { vendor_confirmed_at: new Date().toISOString() })}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Accepter la réservation
              </Button>
            )}
            {booking.status === "confirmed" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("in_progress")}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Marquer en cours
              </Button>
            )}
            {booking.status === "in_progress" && (
              <Button 
                className="w-full" 
                onClick={() => handleStatusUpdate("completed")}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Marquer comme terminé
              </Button>
            )}
            {booking.status === "completed" && booking.payment_status !== "paid" && booking.payment_method === "cash" && (
              <Button 
                className="w-full" 
                variant="default"
                onClick={handlePaymentStatusUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleDollarSign className="mr-2 h-4 w-4" />}
                Confirmer le paiement cash reçu
              </Button>
            )}
            {booking.status !== "cancelled" && booking.status !== "completed" && (
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
              <p className="font-medium">{booking.customer?.nom_complet || "—"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {booking.customer?.contact || "—"}
              </p>
              {booking.customer?.email && (
                <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
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
          {booking.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Notes du client</h3>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Récapitulatif financier */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif financier</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix du service</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              {tvaAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA</span>
                  <span>{formatCurrency(tvaAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              
              <Separator className="my-3" />
              
              <div className="flex justify-between text-green-600 font-medium">
                <span>💰 Votre commission (net)</span>
                <span>{formatCurrency(vendorNet)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-green-600">
                <span>Avance payée</span>
                <span>{formatCurrency(advancePaid)}</span>
              </div>
              {remainingToPay > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Reste à payer</span>
                  <span>{formatCurrency(remainingToPay)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Confirmations */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {booking.vendor_confirmed_at && (
              <p>✓ Acceptée le {format(new Date(booking.vendor_confirmed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
            {booking.client_confirmed_at && (
              <p>✓ Confirmée par client le {format(new Date(booking.client_confirmed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
            )}
          </div>

          {/* Date de création */}
          <div className="text-xs text-muted-foreground">
            Créée le {format(new Date(booking.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
