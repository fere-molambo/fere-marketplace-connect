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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Clock, Star, CreditCard, Banknote } from "lucide-react";
import { format, getDay, parse, addMinutes, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ServiceBookingCalendar } from "@/components/booking/ServiceBookingCalendar";
import { TimeSlotSelector } from "@/components/booking/TimeSlotSelector";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { DeliveryAddressSelector } from "@/components/checkout/DeliveryAddressSelector";
import { AdvancePaymentSelector } from "@/components/checkout/AdvancePaymentSelector";

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
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [advancePercent, setAdvancePercent] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/service/${serviceId}/book`);
    }
  }, [user, authLoading, navigate, serviceId]);

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
    const duration = service.duration; // in minutes
    const slots: TimeSlot[] = [];

    daySlots.forEach(slot => {
      let currentTime = parse(slot.start, "HH:mm", new Date());
      const endTime = parse(slot.end, "HH:mm", new Date());

      while (isBefore(addMinutes(currentTime, duration), endTime) || 
             format(addMinutes(currentTime, duration), "HH:mm") === slot.end) {
        const slotStart = format(currentTime, "HH:mm");
        const slotEnd = format(addMinutes(currentTime, duration), "HH:mm");

        // Check if slot is already booked
        const isBooked = existingBookings.some(b => b.booking_time === slotStart);

        if (!isBooked) {
          slots.push({ start: slotStart, end: slotEnd });
        }

        currentTime = addMinutes(currentTime, duration);
      }
    });

    return slots;
  }, [selectedDate, service, weeklyAvailability, existingBookings]);

  // Set default advance percent from service
  useEffect(() => {
    if (service?.booking_advance_percent && service.booking_advance_percent > 0) {
      setAdvancePercent(service.booking_advance_percent);
    }
  }, [service]);

  // Reset slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  // Calculate prices
  const basePrice = flashSale ? flashSale.flash_price : (service?.price || 0);
  const discountedPrice = service?.discount_percent 
    ? basePrice * (1 - service.discount_percent / 100)
    : basePrice;

  const tvaRate = platformSettings?.tva_rate || 18;
  const tvaAmount = Math.round(discountedPrice * (tvaRate / 100));

  // Get commission rate for services
  const getCommissionRate = (): number => {
    const global = commissions.find((c: any) => c.commission_type === "all_services");
    return global?.commission_rate || 10;
  };

  const commissionRate = getCommissionRate();
  const commissionAmount = Math.round(discountedPrice * (commissionRate / 100));
  const totalPrice = Math.round(discountedPrice + tvaAmount + commissionAmount);
  const advanceAmount = paymentMethod === "online" ? Math.round(totalPrice * (advancePercent / 100)) : 0;
  const remainingAmount = totalPrice - advanceAmount;

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!user || !service || !selectedDate || !selectedSlot) {
        throw new Error("Données manquantes");
      }

      const { data: booking, error } = await supabase
        .from("service_bookings")
        .insert({
          service_id: service.id,
          customer_id: user.id,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          booking_time: selectedSlot.start,
          total_price: totalPrice,
          advance_paid: paymentMethod === "online" ? advanceAmount : 0,
          notes: comment || null,
          delivery_address_id: selectedAddressId,
          payment_method: paymentMethod,
          payment_status: "pending",
          commission_amount: commissionAmount,
          tva_amount: tvaAmount,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return booking;
    },
    onSuccess: async (booking) => {
      if (paymentMethod === "online" && advanceAmount > 0) {
        try {
          const response = await supabase.functions.invoke("paystack-payment", {
            body: {
              action: "initialize",
              amount: advanceAmount,
              email: user?.email,
              payment_type: "service_booking",
              related_id: booking.id,
              metadata: {
                service_id: service?.id,
                booking_date: format(selectedDate!, "yyyy-MM-dd"),
                booking_time: selectedSlot?.start,
              },
              callback_url: `${window.location.origin}/payment/callback`,
            },
          });

          if (response.data?.authorization_url) {
            window.location.href = response.data.authorization_url;
          } else {
            throw new Error("Erreur d'initialisation du paiement");
          }
        } catch (error) {
          toast.error("Erreur lors de l'initialisation du paiement");
          setIsSubmitting(false);
        }
      } else {
        toast.success("Réservation confirmée !");
        navigate(`/payment/callback?reference=CASH-${booking.id}&status=success`);
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
    setIsSubmitting(true);
    createBooking.mutate();
  };

  const isFormValid = selectedDate && selectedSlot;

  if (authLoading || serviceLoading) {
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
                    <p className="text-primary font-bold mt-2">
                      {discountedPrice.toLocaleString()} FCFA
                      {(flashSale || service.discount_percent > 0) && (
                        <span className="text-muted-foreground line-through text-sm ml-2">
                          {service.price.toLocaleString()} FCFA
                        </span>
                      )}
                    </p>
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

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. Mode de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "online" | "cash")}
                  className="space-y-3"
                >
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === "online" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value="online" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">Payer maintenant</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Wave, Mobile Money, Visa/Mastercard
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === "cash" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value="cash" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        <span className="font-medium">Payer à la réalisation</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Payez en espèces après la prestation
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === "online" && (
                  <div className="pt-4">
                    <Label className="text-sm font-medium mb-2 block">
                      Montant de l'acompte
                    </Label>
                    <AdvancePaymentSelector
                      value={advancePercent}
                      onChange={setAdvancePercent}
                      totalAmount={totalPrice}
                    />
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
                basePrice={Math.round(discountedPrice)}
                tvaAmount={tvaAmount}
                tvaRate={tvaRate}
                commissionAmount={commissionAmount}
                commissionRate={commissionRate}
                totalPrice={totalPrice}
                advancePercent={paymentMethod === "online" ? advancePercent : 0}
                advanceAmount={advanceAmount}
                remainingAmount={remainingAmount}
                paymentMethod={paymentMethod}
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
