import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Banknote, Car, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingSummaryProps {
  serviceName: string;
  serviceImage?: string | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  duration: number | null;
  addressLabel?: string;
  servicePrice: number;
  travelFee: number;
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
  servicePrice,
  travelFee,
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

  const hasTravelFee = travelFee > 0;

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

        <Separator />

        {/* Price breakdown - Simplified */}
        <div className="space-y-3">
          {/* Service price - paid in cash */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Prix du service
              </span>
              <span className="font-semibold">{formatPrice(servicePrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              À payer en espèces le jour J
            </p>
          </div>

          {/* Travel fee */}
          <div className={`p-3 rounded-lg space-y-1 ${hasTravelFee ? 'bg-primary/10 border border-primary/20' : 'bg-green-50'}`}>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Frais de déplacement
              </span>
              <span className={`font-semibold ${hasTravelFee ? 'text-primary' : 'text-green-600'}`}>
                {hasTravelFee ? formatPrice(travelFee) : "Gratuit"}
              </span>
            </div>
            {hasTravelFee && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                À payer maintenant en ligne
              </p>
            )}
          </div>
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
          {hasTravelFee 
            ? `Payer ${formatPrice(travelFee)} et réserver`
            : "Confirmer la réservation"
          }
        </Button>
      </CardFooter>
    </Card>
  );
}