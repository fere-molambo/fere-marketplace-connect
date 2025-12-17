import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  // Fetch platform settings
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("tva_rate, delivery_base_fee, delivery_fee_per_500m")
        .single();
      if (error) throw error;
      return data;
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

  // Check if products are in warehouse
  const productIds = items.map(item => item.productId);
  const { data: warehouseStock = [] } = useQuery({
    queryKey: ["warehouse-stock-checkout", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select("product_id, warehouse_id, quantity, warehouses(id, name, address, geolocation_lat, geolocation_lng)")
        .in("product_id", productIds)
        .eq("is_active", true)
        .gt("quantity", 0);
      if (error) throw error;
      return data;
    },
    enabled: productIds.length > 0,
  });

  // Get unique shops in cart
  const uniqueShops = [...new Set(items.map(item => item.product.shops.id))];
  const isMultiVendor = uniqueShops.length > 1;

  // Check if all products in multi-vendor cart are in the same warehouse
  const allProductsInWarehouse = isMultiVendor && 
    items.every(item => warehouseStock.some(ws => ws.product_id === item.productId));

  // Get single shop info for pickup
  const singleShop = !isMultiVendor ? items[0]?.product.shops : null;

  // Calculate delivery fee
  const calculateDeliveryFee = (distanceMeters: number = 0) => {
    if (deliveryType === "pickup") return 0;
    const baseFee = platformSettings?.delivery_base_fee || 1000;
    const per500m = platformSettings?.delivery_fee_per_500m || 500;
    const intervals = Math.floor(distanceMeters / 500);
    return baseFee + (intervals * per500m);
  };

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
  
  const deliveryFee = calculateDeliveryFee(0); // TODO: Calculate actual distance
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
          source_warehouse_id: allProductsInWarehouse ? warehouseStock[0]?.warehouse_id : null,
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
              metadata: {
                order_id: order.id,
                payment_type: "order",
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
        {isMultiVendor && !allProductsInWarehouse && (
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
                  allProductsInWarehouse={allProductsInWarehouse}
                  deliveryFee={deliveryFee}
                />

                {deliveryType === "pickup" && singleShop && (
                  <ShopPickupInfo shop={singleShop} />
                )}

                {deliveryType === "delivery" && user && (
                  <DeliveryAddressSelector
                    userId={user.id}
                    selectedAddressId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                  />
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
                isLoading={isCreatingOrder || createOrder.isPending}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}