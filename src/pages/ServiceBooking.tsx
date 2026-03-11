import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Clock, Star, Banknote, Car, AlertTriangle } from "lucide-react";
import { format, getDay, parse, addMinutes, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ServiceBookingCalendar } from "@/components/booking/ServiceBookingCalendar";
import { TimeSlotSelector } from "@/components/booking/TimeSlotSelector";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { DeliveryAddressSelector } from "@/components/checkout/DeliveryAddressSelector";

interface TimeSlot {
  start: string;
  end: string;
}

interface WeeklyAvailability {
  [key: string]: TimeSlot[];
}

const dayIndexToName: { [key: number]: string } = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

export default function ServiceBooking() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/service/${serviceId}/book`);
    }
  }, [user, authLoading, navigate, serviceId]);

  // Check if client already has an active booking
  const { data: activeBooking, isLoading: activeBookingLoading } = useQuery({
    queryKey: ["active-booking-check", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id, status, service_id, booking_date, booking_time, service:services(name)")
        .eq("customer_id", user!.id)
        .in("status", ["pending", "accepted", "on_the_way", "arrived"])
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch service details
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ["service-booking", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          shops (id, name, logo_url, is_official, owner_id, shop_type)
        `)
        .eq("id", serviceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  // Fetch flash sale
  const { data: flashSale } = useQuery({
    queryKey: ["flash-sale-booking", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  // Fetch platform settings
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-booking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("tva_rate")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ["category-commissions-booking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_commissions")
        .select("service_type_id, commission_rate, commission_type");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing bookings for anti-double booking
  const { data: existingBookings = [] } = useQuery({
    queryKey: ["existing-bookings", serviceId, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("service_bookings")
        .select("booking_date, booking_time")
        .eq("service_id", serviceId)
        .eq("booking_date", dateStr)
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId && !!selectedDate,
  });

  // Calculate weekly availability from service data
  const weeklyAvailability = useMemo<WeeklyAvailability>(() => {
    if (!service?.weekly_availability) return {};
    const raw = service.weekly_availability as any;
    const result: WeeklyAvailability = {};
    Object.keys(raw).forEach(day => {
      const dayData = raw[day];
      if (Array.isArray(dayData) && dayData.length > 0) {
        result[day] = dayData;
      }
    });
    return result;
  }, [service]);

  // Generate available time slots for selected date
  const availableSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedDate || !service?.duration) return [];
    
    const dayName = dayIndexToName[getDay(selectedDate)];
    const daySlots = weeklyAvailability[dayName] || [];
    const duration = service.duration;
    const slots: TimeSlot[] = [];

    daySlots.forEach(slot => {
      let currentTime = parse(slot.start, "HH:mm", new Date());
      const endTime = parse(slot.end, "HH:mm", new Date());

      while (isBefore(addMinutes(currentTime, duration), endTime) || 
             format(addMinutes(currentTime, duration), "HH:mm") === slot.end) {
        const slotStart = format(currentTime, "HH:mm");
        const slotEnd = format(addMinutes(currentTime, duration), "HH:mm");

        const isBooked = existingBookings.some(b => b.booking_time === slotStart);

        if (!isBooked) {
          slots.push({ start: slotStart, end: slotEnd });
        }

        currentTime = addMinutes(currentTime, duration);
      }
    });

    return slots;
  }, [selectedDate, service, weeklyAvailability, existingBookings]);

  // Reset slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // Calculate prices - SIMPLIFIED
  const baseServicePrice = flashSale ? flashSale.flash_price : (service?.price || 0);
  const discountedServicePrice = service?.discount_percent 
    ? baseServicePrice * (1 - service.discount_percent / 100)
    : baseServicePrice;

  // Travel fee
  const travelFeeType = service?.travel_fee_type || "free";
  const travelFeeAmount = travelFeeType === "paid" ? (service?.travel_fee_amount || 0) : 0;

  // Get commission rate for services (applied to service price only)
  const getCommissionRate = (): number => {
    const global = commissions.find((c: any) => c.commission_type === "all_services");
    return global?.commission_rate || 10;
  };

  const commissionRate = getCommissionRate();
  const commissionAmount = Math.round(discountedServicePrice * (commissionRate / 100));

  // Total service price (paid in cash) - includes TVA and commission for display
  const tvaRate = platformSettings?.tva_rate || 18;
  const tvaAmount = Math.round(discountedServicePrice * (tvaRate / 100));
  const totalServicePrice = Math.round(discountedServicePrice + tvaAmount + commissionAmount);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!user || !service || !selectedDate || !selectedSlot) {
        throw new Error("Données manquantes");
      }

      // Calculate auto_cancel_at = now + 24h
      const autoCancelAt = new Date();
      autoCancelAt.setHours(autoCancelAt.getHours() + 24);

      const { data: booking, error } = await supabase
        .from("service_bookings")
        .insert({
          service_id: service.id,
          customer_id: user.id,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          booking_time: selectedSlot.start,
          total_price: totalServicePrice,
          travel_fee: travelFeeAmount,
          travel_fee_paid: false,
          advance_paid: 0,
          notes: comment || null,
          delivery_address_id: selectedAddressId,
          payment_method: travelFeeAmount > 0 ? "online" : "none",
          payment_status: travelFeeAmount > 0 ? "pending" : "not_required",
          commission_amount: commissionAmount,
          tva_amount: tvaAmount,
          status: "pending",
          auto_cancel_at: autoCancelAt.toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return booking;
    },
    onSuccess: async (booking) => {
      if (travelFeeAmount > 0) {
        // Pay travel fee via Paystack
        try {
          const response = await supabase.functions.invoke("orange-money-payment", {
            body: {
              action: "initialize",
              amount: travelFeeAmount,
              email: user?.email,
              payment_type: "service_booking",
              related_id: booking.id,
              metadata: {
                service_id: service?.id,
                booking_date: format(selectedDate!, "yyyy-MM-dd"),
                booking_time: selectedSlot?.start,
                is_travel_fee: true,
              },
              return_url: `${window.location.origin}/payment/callback`,
              cancel_url: `${window.location.origin}/service/${service?.id}/book`,
            },
          });

          if (response.data?.payment_url) {
            sessionStorage.setItem('om_payment_type', 'service_booking');
            sessionStorage.setItem('om_order_id', response.data.order_id);
            sessionStorage.setItem('om_pay_token', response.data.pay_token);
            
            await supabase
              .from("service_bookings")
              .update({ payment_reference: response.data.order_id })
              .eq("id", booking.id);
              
            window.location.href = response.data.payment_url;
          } else {
            // ROLLBACK: delete the booking if payment init fails
            console.error("Payment init failed, rolling back booking", booking.id);
            await supabase
              .from("service_bookings")
              .delete()
              .eq("id", booking.id);
            throw new Error("Erreur d'initialisation du paiement. Aucune réservation n'a été conservée.");
          }
        } catch (error: any) {
          // ROLLBACK: also delete booking on any unexpected error
          if (booking?.id) {
            await supabase
              .from("service_bookings")
              .delete()
              .eq("id", booking.id)
              .then(() => console.log("Booking rolled back:", booking.id));
          }
          toast.error(error?.message || "Erreur lors de l'initialisation du paiement. Aucune réservation n'a été conservée.");
          setIsSubmitting(false);
        }
      } else {
        // No travel fee - booking confirmed directly
        toast.success("Réservation confirmée !");
        navigate("/mon-profil?tab=orders");
      }
    },
    onError: (error) => {
      console.error("Booking error:", error);
      toast.error("Erreur lors de la réservation");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error("Veuillez sélectionner une date et un créneau");
      return;
    }
    if (activeBooking) {
      toast.error("Vous avez déjà une réservation en cours. Terminez-la ou annulez-la avant d'en créer une nouvelle.");
      return;
    }
    setIsSubmitting(true);
    createBooking.mutate();
  };

  const isFormValid = selectedDate && selectedSlot;

  if (authLoading || serviceLoading || activeBookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-4">Service non trouvé</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    );
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Active booking warning */}
        {activeBooking && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Vous avez déjà une réservation en cours</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre réservation pour "{(activeBooking as any).service?.name}" est en statut "{activeBooking.status}". 
                Terminez-la ou annulez-la avant d'en créer une nouvelle.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/mon-profil?tab=orders")}>
                Voir mes réservations
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Réserver une prestation</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service preview */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {service.main_media_url && (
                    <img 
                      src={service.main_media_url} 
                      alt={service.name}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">{service.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>4.7</span>
                      {service.duration && (
                        <>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(service.duration)}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-primary font-bold">
                        {totalServicePrice.toLocaleString()} FCFA
                        {(flashSale || (service.discount_percent && service.discount_percent > 0)) && (
                          <span className="text-muted-foreground line-through text-sm ml-2">
                            {service.price.toLocaleString()} FCFA
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        À payer en ligne à l'arrivée du prestataire
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Date et heure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceBookingCalendar
                  weeklyAvailability={weeklyAvailability}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />

                {selectedDate && (
                  <TimeSlotSelector
                    slots={availableSlots}
                    selectedSlot={selectedSlot}
                    onSelect={setSelectedSlot}
                  />
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Lieu de la prestation</CardTitle>
              </CardHeader>
              <CardContent>
                {user && (
                  <DeliveryAddressSelector
                    userId={user.id}
                    selectedAddressId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                  />
                )}
              </CardContent>
            </Card>

            {/* Comment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Commentaire pour le prestataire</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Décrivez vos besoins spécifiques, préférences ou toute information utile pour le prestataire..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Travel Fee Info */}
            <Card className={travelFeeAmount > 0 ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  4. Frais de déplacement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {travelFeeAmount > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                      <span className="font-medium">Frais de déplacement</span>
                      <span className="text-lg font-bold text-primary">{travelFeeAmount.toLocaleString()} FCFA</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ces frais seront payés maintenant en ligne pour confirmer votre réservation.
                      Le prestataire recevra ce montant après son arrivée chez vous.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
                    <Car className="h-5 w-5" />
                    <span className="font-medium">Déplacement gratuit</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingSummary
                serviceName={service.name}
                serviceImage={service.main_media_url}
                selectedDate={selectedDate || null}
                selectedTime={selectedSlot?.start || null}
                duration={service.duration}
                addressLabel={selectedAddressId ? "Adresse sélectionnée" : undefined}
                servicePrice={totalServicePrice}
                travelFee={travelFeeAmount}
                onSubmit={handleSubmit}
                isLoading={isSubmitting}
                isDisabled={!isFormValid}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}