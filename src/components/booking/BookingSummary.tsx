import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingSummaryProps {
  serviceName: string;
  serviceImage?: string | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  duration: number | null;
  addressLabel?: string;
  basePrice: number;
  tvaAmount: number;
  tvaRate: number;
  commissionAmount: number;
  commissionRate: number;
  totalPrice: number;
  advancePercent: number;
  advanceAmount: number;
  remainingAmount: number;
  paymentMethod: "online" | "cash";
  onSubmit: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function BookingSummary({
  serviceName,
  serviceImage,
  selectedDate,
  selectedTime,
  duration,
  addressLabel,
  basePrice,
  tvaAmount,
  tvaRate,
  commissionAmount,
  commissionRate,
  totalPrice,
  advancePercent,
  advanceAmount,
  remainingAmount,
  paymentMethod,
  onSubmit,
  isLoading,
  isDisabled,
}: BookingSummaryProps) {
  const formatPrice = (price: number) => `${price.toLocaleString()} FCFA`;
  
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Récapitulatif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service info */}
        <div className="flex gap-3">
          {serviceImage && (
            <img 
              src={serviceImage} 
              alt={serviceName} 
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{serviceName}</p>
            {duration && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(duration)}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Date & Time */}
        {selectedDate && selectedTime && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })} à {selectedTime}
            </span>
          </div>
        )}

        {/* Address */}
        {addressLabel && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{addressLabel}</span>
          </div>
        )}

        {/* Payment method */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-primary" />
          <span>
            {paymentMethod === "online" ? "Paiement en ligne" : "Paiement à la réalisation"}
          </span>
        </div>

        <Separator />

        {/* Price breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Prestation</span>
            <span>{formatPrice(basePrice)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>TVA ({tvaRate}%)</span>
            <span>{formatPrice(tvaAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Commission ({commissionRate}%)</span>
            <span>{formatPrice(commissionAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="text-primary">{formatPrice(totalPrice)}</span>
          </div>

          {paymentMethod === "online" && advancePercent < 100 && (
            <>
              <Separator />
              <div className="flex justify-between text-primary font-medium">
                <span>Acompte à payer ({advancePercent}%)</span>
                <span>{formatPrice(advanceAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Reste à payer</span>
                <span>{formatPrice(remainingAmount)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="lg"
          onClick={onSubmit}
          disabled={isDisabled || isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {paymentMethod === "online" 
            ? `Payer ${formatPrice(advanceAmount)}`
            : "Confirmer la réservation"
          }
        </Button>
      </CardFooter>
    </Card>
  );
}
