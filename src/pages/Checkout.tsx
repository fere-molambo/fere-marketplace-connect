import { useState, useEffect, useMemo } from "react";
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
import { ArrowLeft, Loader2, AlertTriangle, Info } from "lucide-react";
import { DeliveryAddressSelector } from "@/components/checkout/DeliveryAddressSelector";
import { OrdersByVendorSummary } from "@/components/checkout/OrdersByVendorSummary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, clearCart, totalAmount } = useCart();
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
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

  // Fetch platform settings with delivery fields
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("tva_rate, delivery_base_fee, delivery_fee_per_km, delivery_discount_per_km, delivery_commission_fere, delivery_commission_driver")
        .single();
      if (error) throw error;
      return data as {
        tva_rate: number;
        delivery_base_fee: number;
        delivery_fee_per_km: number;
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

  // Group items by shop (1 order = 1 vendor)
  const itemsByShop = useMemo(() => {
    const grouped: Record<string, typeof items> = {};
    items.forEach(item => {
      const shopId = item.product.shops.id;
      if (!grouped[shopId]) {
        grouped[shopId] = [];
      }
      grouped[shopId].push(item);
    });
    return grouped;
  }, [items]);

  const shopCount = Object.keys(itemsByShop).length;
  const isMultiVendor = shopCount > 1;

  // Use the delivery calculation hook
  const clientCoordinates = selectedAddress?.geolocation_lat && selectedAddress?.geolocation_lng
    ? { lat: selectedAddress.geolocation_lat, lng: selectedAddress.geolocation_lng }
    : null;

  const deliverySettings = platformSettings ? {
    delivery_base_fee: platformSettings.delivery_base_fee || 500,
    delivery_fee_per_km: platformSettings.delivery_fee_per_km || 200,
    delivery_discount_per_km: platformSettings.delivery_discount_per_km || 5,
    delivery_commission_fere: platformSettings.delivery_commission_fere || 20,
    delivery_commission_driver: platformSettings.delivery_commission_driver || 80,
  } : null;

  const { 
    zones: deliveryZones, 
    totalDeliveryFee, 
    isLoading: isCalculatingDelivery,
  } = useDeliveryCalculation(
    items,
    clientCoordinates,
    "delivery",
    deliverySettings
  );

  // Calculate delivery fee per shop (equal distribution or zone-based)
  const deliveryFeePerShop = useMemo(() => {
    const fees: Record<string, number> = {};
    const baseFee = platformSettings?.delivery_base_fee || 500;
    
    const perShopFee = Math.ceil((totalDeliveryFee || baseFee * shopCount) / shopCount);
    
    Object.keys(itemsByShop).forEach(shopId => {
      fees[shopId] = perShopFee;
    });
    
    return fees;
  }, [itemsByShop, totalDeliveryFee, shopCount, platformSettings]);

  // Calculate commission for a product
  const getCommissionRate = (categoryId: string | null | undefined): number => {
    const specificCommission = commissions.find((c: any) => c.category_id === categoryId);
    if (specificCommission) return specificCommission.commission_rate;
    
    const globalCommission = commissions.find((c: any) => c.commission_type === "all_products" || (!c.category_id && !c.service_type_id));
    return globalCommission?.commission_rate || 10;
  };

  // Calculate totals for the two-step payment
  const totalDelivery = Object.values(deliveryFeePerShop).reduce((sum, fee) => sum + fee, 0);
  const deliveryCommissionFere = Math.round(totalDelivery * ((platformSettings?.delivery_commission_fere || 20) / 100));
  const totalProductCommission = Object.entries(itemsByShop).reduce((sum, [_, shopItems]) => {
    return sum + shopItems.reduce((s, item) => {
      const rate = getCommissionRate((item.product as any).category_id) / 100;
      return s + Math.round(item.totalPrice * rate);
    }, 0);
  }, 0);

  // Advance = delivery + commissions (no transaction fees with Orange Money)
  const advanceAmount = totalDelivery + deliveryCommissionFere + totalProductCommission;

  // Balance = product subtotal (no transaction fees)
  const balanceAmount = totalAmount;

  // Create orders mutation (1 order per vendor)
  const createOrders = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      if (!selectedAddress) throw new Error("Adresse non sélectionnée");

      const paymentGroupId = crypto.randomUUID();
      const createdOrders: any[] = [];

      // Create one order per shop
      for (const [shopId, shopItems] of Object.entries(itemsByShop)) {
        const shopSubtotal = shopItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const shopDeliveryFee = deliveryFeePerShop[shopId];
        const shopTotal = shopSubtotal + shopDeliveryFee;

        const tvaRate = (platformSettings?.tva_rate || 18) / 100;
        const shopTva = Math.round(shopSubtotal * tvaRate);

        const shopCommission = shopItems.reduce((sum, item) => {
          const rate = getCommissionRate((item.product as any).category_id) / 100;
          return sum + Math.round(item.totalPrice * rate);
        }, 0);

        // Calculate per-shop advance & balance
        const shopDeliveryCommission = Math.round(shopDeliveryFee * ((platformSettings?.delivery_commission_fere || 20) / 100));
        const shopAdvance = shopDeliveryFee + shopDeliveryCommission + shopCommission;
        const shopBalance = shopSubtotal;

        // Generate order number
        const { data: orderNumber, error: orderNumError } = await supabase.rpc("generate_order_number");
        if (orderNumError) throw orderNumError;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            user_id: user.id,
            shop_id: shopId,
            delivery_type: "delivery",
            delivery_address_id: selectedAddressId,
            delivery_fee: shopDeliveryFee,
            subtotal: shopSubtotal,
            tva_amount: shopTva,
            commission_amount: shopCommission,
            total_amount: shopTotal,
            advance_amount: shopAdvance,
            balance_amount: shopBalance,
            advance_paid: 0,
            payment_method: "advance",
            payment_status: "pending",
            balance_payment_status: "pending",
            payment_group_id: paymentGroupId,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = shopItems.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          shop_id: shopId,
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

        // Create delivery request
        const firstItem = shopItems[0];
        const driverEarningsPercent = (deliverySettings?.delivery_commission_driver || 80) / 100;
        const driverEarnings = Math.round(shopDeliveryFee * driverEarningsPercent);

        const pickupPoint = {
          shop_id: shopId,
          shop_name: firstItem.product.shops.name,
          lat: firstItem.product.shops.geolocation_lat || 0,
          lng: firstItem.product.shops.geolocation_lng || 0,
          address: firstItem.product.shops.address || "",
        };

        const { error: deliveryError } = await supabase
          .from("delivery_requests")
          .insert({
            order_id: order.id,
            zone_id: firstItem.product.shops.delivery_zone_id || null,
            status: "pending",
            pickup_point: pickupPoint,
            pickup_points: [pickupPoint],
            delivery_point: {
              lat: selectedAddress.geolocation_lat,
              lng: selectedAddress.geolocation_lng,
              address: selectedAddress.address,
              recipient_name: selectedAddress.recipient_name || user.user_metadata?.nom_complet,
              recipient_phone: selectedAddress.recipient_phone,
            },
            delivery_fee: shopDeliveryFee,
            driver_earnings: driverEarnings,
          });

        if (deliveryError) {
          console.error("Error creating delivery request:", deliveryError);
          throw new Error(`Échec de création de la demande de livraison: ${deliveryError.message}`);
        }

        createdOrders.push(order);
      }

      return { orders: createdOrders, paymentGroupId };
    },
    onSuccess: async ({ orders, paymentGroupId }) => {
      // Initialize Paystack payment for the advance amount
      try {
      const response = await supabase.functions.invoke("orange-money-payment", {
          body: {
            action: "initialize",
            amount: advanceAmount,
            email: user?.email,
            payment_type: "order",
            related_id: orders[0].id,
            metadata: {
              payment_group_id: paymentGroupId,
              order_numbers: orders.map((o: any) => o.order_number).join(", "),
              order_count: orders.length,
              is_advance: true,
            },
            return_url: `${window.location.origin}/payment/callback`,
            cancel_url: `${window.location.origin}/checkout`,
          },
        });

        if (response.data?.payment_url) {
          sessionStorage.setItem('om_payment_type', 'order');
          sessionStorage.setItem('om_order_id', response.data.order_id);
          sessionStorage.setItem('om_pay_token', response.data.pay_token);
          clearCart();
          window.location.href = response.data.payment_url;
        } else {
          throw new Error("Erreur d'initialisation du paiement");
        }
      } catch (error) {
        toast.error("Erreur lors de l'initialisation du paiement");
      }
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast.error("Erreur lors de la création de la commande");
      setIsCreatingOrder(false);
    },
  });

  const handleSubmit = () => {
    if (!selectedAddressId) {
      toast.error("Veuillez sélectionner une adresse de livraison");
      return;
    }
    setIsCreatingOrder(true);
    createOrders.mutate();
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

        {/* Multi-vendor info */}
        {isMultiVendor && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{shopCount} commandes seront créées</AlertTitle>
            <AlertDescription>
              Votre panier contient des produits de {shopCount} boutiques différentes.
              Chaque boutique recevra sa propre commande avec sa livraison dédiée.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment info - two-step system */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Paiement en 2 étapes</AlertTitle>
          <AlertDescription>
            Vous payez d'abord un acompte (frais de livraison + commissions). 
            Le solde (montant des produits) sera payé à la livraison, après vérification de votre colis.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Adresse de livraison</CardTitle>
              </CardHeader>
              <CardContent>
                {user && (
                  <DeliveryAddressSelector
                    userId={user.id}
                    selectedAddressId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                  />
                )}
                {isCalculatingDelivery && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calcul des frais de livraison...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrdersByVendorSummary
                  itemsByShop={itemsByShop}
                  deliveryFeePerShop={deliveryFeePerShop}
                  advanceAmount={advanceAmount}
                  balanceAmount={balanceAmount}
                  deliveryCommission={deliveryCommissionFere}
                  productCommission={totalProductCommission}
                />

                <Button
                  onClick={handleSubmit}
                  disabled={isCreatingOrder || createOrders.isPending || !selectedAddressId}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingOrder || createOrders.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    `Payer l'acompte : ${advanceAmount.toLocaleString()} FCFA`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
