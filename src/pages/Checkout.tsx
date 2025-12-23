import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { useDeliveryCalculation } from "@/hooks/useDeliveryCalculation";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DeliveryTypeSelector } from "@/components/checkout/DeliveryTypeSelector";
import { DeliveryAddressSelector } from "@/components/checkout/DeliveryAddressSelector";
import { ShopPickupInfo } from "@/components/checkout/ShopPickupInfo";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { AdvancePaymentSelector } from "@/components/checkout/AdvancePaymentSelector";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { MultiVendorWarning } from "@/components/checkout/MultiVendorWarning";

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, clearCart, totalAmount } = useCart();
  
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [advancePercent, setAdvancePercent] = useState(100);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/checkout");
    }
  }, [user, authLoading, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !authLoading) {
      navigate("/produits-services");
    }
  }, [items, authLoading, navigate]);

  // Fetch platform settings with new delivery fields
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("tva_rate, delivery_base_fee, delivery_fee_per_100m, delivery_discount_per_km, delivery_commission_fere, delivery_commission_driver")
        .single();
      if (error) throw error;
      return data as {
        tva_rate: number;
        delivery_base_fee: number;
        delivery_fee_per_100m: number;
        delivery_discount_per_km: number;
        delivery_commission_fere: number;
        delivery_commission_driver: number;
      };
    },
  });

  // Fetch category commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ["category-commissions-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_commissions")
        .select("category_id, service_type_id, commission_rate, commission_type");
      if (error) throw error;
      return data;
    },
  });

  // Fetch selected delivery address
  const { data: selectedAddress } = useQuery({
    queryKey: ["delivery-address", selectedAddressId],
    queryFn: async () => {
      if (!selectedAddressId) return null;
      const { data, error } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("id", selectedAddressId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAddressId,
  });

  // Get unique shops in cart
  const uniqueShops = [...new Set(items.map(item => item.product.shops.id))];
  const isMultiVendor = uniqueShops.length > 1;
  const singleShop = !isMultiVendor ? items[0]?.product.shops : null;

  // Use the new delivery calculation hook
  const clientCoordinates = selectedAddress?.geolocation_lat && selectedAddress?.geolocation_lng
    ? { lat: selectedAddress.geolocation_lat, lng: selectedAddress.geolocation_lng }
    : null;

  const deliverySettings = platformSettings ? {
    delivery_base_fee: platformSettings.delivery_base_fee || 500,
    delivery_fee_per_100m: platformSettings.delivery_fee_per_100m || 100,
    delivery_discount_per_km: platformSettings.delivery_discount_per_km || 5,
    delivery_commission_fere: platformSettings.delivery_commission_fere || 20,
    delivery_commission_driver: platformSettings.delivery_commission_driver || 80,
  } : null;

  const { 
    zones: deliveryZones, 
    totalDeliveryFee, 
    isLoading: isCalculatingDelivery 
  } = useDeliveryCalculation(
    items,
    clientCoordinates,
    deliveryType,
    deliverySettings
  );

  // Calculate delivery fee (use calculated or fallback)
  const deliveryFee = deliveryType === "pickup" ? 0 : totalDeliveryFee || (platformSettings?.delivery_base_fee || 500);

  // Calculate commission for a product
  const getCommissionRate = (categoryId: string | null | undefined): number => {
    // Find specific category commission
    const specificCommission = commissions.find((c: any) => c.category_id === categoryId);
    if (specificCommission) return specificCommission.commission_rate;
    
    // Find global product commission
    const globalCommission = commissions.find((c: any) => c.commission_type === "all_products" || (!c.category_id && !c.service_type_id));
    return globalCommission?.commission_rate || 10;
  };

  // Calculate totals
  const subtotal = totalAmount;
  const tvaRate = (platformSettings?.tva_rate || 18) / 100;
  const tvaAmount = Math.round(subtotal * tvaRate);
  
  const commissionAmount = items.reduce((sum, item) => {
    const rate = getCommissionRate((item.product as any).category_id) / 100;
    return sum + Math.round(item.totalPrice * rate);
  }, 0);
  
  const totalTTC = subtotal + tvaAmount + commissionAmount + deliveryFee;
  const advanceAmount = Math.round(totalTTC * (advancePercent / 100));
  const remainingAmount = totalTTC - advanceAmount;

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      
      // Generate order number
      const { data: orderNumber, error: orderNumError } = await supabase.rpc("generate_order_number");
      if (orderNumError) throw orderNumError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          delivery_type: deliveryType,
          delivery_address_id: deliveryType === "delivery" ? selectedAddressId : null,
          delivery_fee: deliveryFee,
          subtotal,
          tva_amount: tvaAmount,
          commission_amount: commissionAmount,
          total_amount: totalTTC,
          advance_percent: advancePercent,
          advance_paid: paymentMethod === "online" ? advanceAmount : 0,
          remaining_amount: paymentMethod === "online" ? remainingAmount : totalTTC,
          payment_method: paymentMethod,
          payment_status: "pending",
          is_multi_vendor: isMultiVendor,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        shop_id: item.product.shops.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        commission_rate: getCommissionRate((item.product as any).category_id),
        commission_amount: Math.round(item.totalPrice * (getCommissionRate((item.product as any).category_id) / 100)),
        selected_color: item.selectedColor,
        selected_size: item.selectedSize,
        proposed_price: item.proposedPrice,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create delivery requests for delivery orders
      if (deliveryType === "delivery" && selectedAddress) {
        // If we have calculated zones, use them; otherwise create a generic request
        if (deliveryZones.length > 0) {
          const deliveryRequests = deliveryZones.map(zone => ({
            order_id: order.id,
            zone_id: zone.zone_id,
            status: "pending",
            pickup_points: zone.vendors,
            delivery_point: {
              lat: selectedAddress.geolocation_lat,
              lng: selectedAddress.geolocation_lng,
              address: selectedAddress.address,
              recipient_name: selectedAddress.recipient_name || user.user_metadata?.nom_complet,
              recipient_phone: selectedAddress.recipient_phone
            },
            total_distance_meters: zone.total_distance_meters,
            delivery_fee: zone.delivery_fee,
            driver_earnings: zone.driver_earnings
          }));

          const { error: deliveryError } = await supabase
            .from("delivery_requests")
            .insert(deliveryRequests);

          if (deliveryError) {
            console.error("Error creating delivery requests:", deliveryError);
          }
        } else {
          // No zones calculated - create a generic delivery request with base fee
          const baseFee = platformSettings?.delivery_base_fee || 500;
          const driverEarnings = Math.round(baseFee * (1 - (platformSettings?.delivery_commission_fere || 20) / 100));
          
          // Build pickup points from cart items
          const uniqueShopsList = [...new Map(items.map(item => [
            item.product.shops.id,
            {
              shop_id: item.product.shops.id,
              shop_name: item.product.shops.name,
              lat: item.product.shops.geolocation_lat || selectedAddress.geolocation_lat || 0,
              lng: item.product.shops.geolocation_lng || selectedAddress.geolocation_lng || 0,
              address: item.product.shops.address || '',
              pickup_order: 1,
              distance_to_next: 0,
              is_approximated: !item.product.shops.geolocation_lat
            }
          ])).values()];

          const { error: deliveryError } = await supabase
            .from("delivery_requests")
            .insert({
              order_id: order.id,
              zone_id: null,
              status: "pending",
              pickup_points: uniqueShopsList,
              delivery_point: {
                lat: selectedAddress.geolocation_lat,
                lng: selectedAddress.geolocation_lng,
                address: selectedAddress.address,
                recipient_name: selectedAddress.recipient_name || user.user_metadata?.nom_complet,
                recipient_phone: selectedAddress.recipient_phone
              },
              total_distance_meters: 3000, // Default 3km estimate
              delivery_fee: baseFee,
              driver_earnings: driverEarnings
            });

          if (deliveryError) {
            console.error("Error creating generic delivery request:", deliveryError);
          }
        }
      }

      return order;
    },
    onSuccess: async (order) => {
      if (paymentMethod === "online" && advanceAmount > 0) {
        // Initialize Paystack payment
        try {
          const response = await supabase.functions.invoke("paystack-payment", {
            body: {
              action: "initialize",
              amount: advanceAmount,
              email: user?.email,
              payment_type: "order",
              related_id: order.id,
              metadata: {
                order_number: order.order_number,
              },
              callback_url: `${window.location.origin}/payment/callback`,
            },
          });

          if (response.data?.authorization_url) {
            clearCart();
            window.location.href = response.data.authorization_url;
          } else {
            throw new Error("Erreur d'initialisation du paiement");
          }
        } catch (error) {
          toast.error("Erreur lors de l'initialisation du paiement");
        }
      } else {
        // Cash payment
        clearCart();
        toast.success("Commande créée avec succès!");
        navigate(`/payment/callback?reference=CASH-${order.id}&status=success`);
      }
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast.error("Erreur lors de la création de la commande");
    },
  });

  const handleSubmit = () => {
    if (deliveryType === "delivery" && !selectedAddressId) {
      toast.error("Veuillez sélectionner une adresse de livraison");
      return;
    }
    setIsCreatingOrder(true);
    createOrder.mutate();
  };

  if (authLoading || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Finaliser ma commande</h1>
        </div>

        {/* Multi-vendor warning */}
        {isMultiVendor && (
          <MultiVendorWarning shopCount={uniqueShops.length} />
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Mode de livraison</CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryTypeSelector
                  value={deliveryType}
                  onChange={setDeliveryType}
                  isMultiVendor={isMultiVendor}
                  deliveryFee={deliveryFee}
                />

                {deliveryType === "pickup" && (
                  <ShopPickupInfo 
                    shops={items.map(item => ({
                      id: item.product.shops.id,
                      name: item.product.shops.name,
                      address: item.product.shops.address || undefined,
                      google_maps_link: (item.product.shops as any).google_maps_link || undefined,
                      geolocation_lat: item.product.shops.geolocation_lat ?? undefined,
                      geolocation_lng: item.product.shops.geolocation_lng ?? undefined,
                      opening_time: (item.product.shops as any).opening_time || undefined,
                      closing_time: (item.product.shops as any).closing_time || undefined,
                      support_phone: (item.product.shops as any).support_phone || undefined,
                    })).filter((shop, index, self) => 
                      index === self.findIndex(s => s.id === shop.id)
                    )}
                  />
                )}

                {deliveryType === "delivery" && user && (
                  <>
                    <DeliveryAddressSelector
                      userId={user.id}
                      selectedAddressId={selectedAddressId}
                      onSelect={setSelectedAddressId}
                    />
                    {isCalculatingDelivery && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calcul des frais de livraison...
                      </div>
                    )}
                    {deliveryZones.length > 1 && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {deliveryZones.length} courses de livraison (vendeurs dans différentes zones)
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Mode de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />

                {paymentMethod === "online" && (
                  <AdvancePaymentSelector
                    value={advancePercent}
                    onChange={setAdvancePercent}
                    totalAmount={totalTTC}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                tvaAmount={tvaAmount}
                tvaRate={platformSettings?.tva_rate || 18}
                commissionAmount={commissionAmount}
                deliveryFee={deliveryFee}
                deliveryType={deliveryType}
                totalTTC={totalTTC}
                advancePercent={advancePercent}
                advanceAmount={advanceAmount}
                remainingAmount={remainingAmount}
                paymentMethod={paymentMethod}
                onSubmit={handleSubmit}
                isLoading={isCreatingOrder || createOrder.isPending || isCalculatingDelivery}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
