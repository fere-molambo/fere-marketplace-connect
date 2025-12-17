import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Package, Loader2, Trash2, Search, Store, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WarehouseStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [shopSearch, setShopSearch] = useState("");
  const [formData, setFormData] = useState({
    warehouse_id: "",
    product_id: "",
    quantity: 0,
    is_active: true,
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock for selected warehouse
  const { data: stock = [], isLoading: stockLoading } = useQuery({
    queryKey: ["warehouse-stock", selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return [];
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select(`
          *,
          products(id, name, main_media_url, price, quantity_available, shops(name))
        `)
        .eq("warehouse_id", selectedWarehouse)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWarehouse,
  });

  // Fetch shops for selection
  const { data: shops = [] } = useQuery({
    queryKey: ["shops-for-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, logo_url")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products from selected shop
  const { data: shopProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products-for-stock", selectedShop],
    queryFn: async () => {
      if (!selectedShop) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, main_media_url, price, quantity_available")
        .eq("shop_id", selectedShop)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedShop,
  });

  // Create stock mutation with transfer logic
  const addStock = useMutation({
    mutationFn: async (data: typeof formData) => {
      // 1. Get current product stock
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("quantity_available")
        .eq("id", data.product_id)
        .single();
      
      if (fetchError) throw fetchError;
      if (!product) throw new Error("Produit introuvable");
      
      const currentStock = product.quantity_available || 0;
      if (currentStock < data.quantity) {
        throw new Error(`Stock insuffisant chez le vendeur. Disponible: ${currentStock}`);
      }

      // 2. Check if product already in warehouse
      const { data: existingStock } = await supabase
        .from("warehouse_stock")
        .select("id, quantity")
        .eq("warehouse_id", data.warehouse_id)
        .eq("product_id", data.product_id)
        .single();

      if (existingStock) {
        // Update existing stock
        const { error: updateStockError } = await supabase
          .from("warehouse_stock")
          .update({ quantity: existingStock.quantity + data.quantity })
          .eq("id", existingStock.id);
        if (updateStockError) throw updateStockError;
      } else {
        // Add new stock entry
        const { error: insertError } = await supabase.from("warehouse_stock").insert({
          warehouse_id: data.warehouse_id,
          product_id: data.product_id,
          quantity: data.quantity,
          is_active: data.is_active,
          added_by: user?.id,
        });
        if (insertError) throw insertError;
      }

      // 3. Decrement vendor stock
      const { error: decrementError } = await supabase
        .from("products")
        .update({ quantity_available: currentStock - data.quantity })
        .eq("id", data.product_id);
      if (decrementError) throw decrementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-stock"] });
      toast.success("Stock transféré avec succès");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors du transfert");
    },
  });

  // Update stock mutation
  const updateStock = useMutation({
    mutationFn: async ({ id, quantity, is_active }: { id: string; quantity: number; is_active: boolean }) => {
      const { error } = await supabase
        .from("warehouse_stock")
        .update({ quantity, is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast.success("Stock mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Delete stock mutation (returns to vendor)
  const deleteStock = useMutation({
    mutationFn: async ({ id, productId, quantity }: { id: string; productId: string; quantity: number }) => {
      // 1. Get current product stock
      const { data: product } = await supabase
        .from("products")
        .select("quantity_available")
        .eq("id", productId)
        .single();

      // 2. Return stock to vendor
      if (product) {
        await supabase
          .from("products")
          .update({ quantity_available: (product.quantity_available || 0) + quantity })
          .eq("id", productId);
      }

      // 3. Delete from warehouse
      const { error } = await supabase.from("warehouse_stock").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-stock"] });
      toast.success("Stock retourné au vendeur");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const resetForm = () => {
    setFormData({ warehouse_id: "", product_id: "", quantity: 0, is_active: true });
    setSelectedShop("");
    setShopSearch("");
  };

  // Filter shops by search
  const filteredShops = shops.filter((s: any) =>
    s.name.toLowerCase().includes(shopSearch.toLowerCase())
  );

  // Get products not already in selected warehouse
  const stockProductIds = stock.map((s: any) => s.product_id);
  const availableProducts = shopProducts.filter((p: any) => !stockProductIds.includes(p.id));

  // Selected product info
  const selectedProduct = shopProducts.find((p: any) => p.id === formData.product_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion de Stock</h1>
          <p className="text-muted-foreground">Transférez des produits des vendeurs vers les entrepôts</p>
        </div>
      </div>

      {/* Warehouse selector */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un entrepôt</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label>Entrepôt</Label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedWarehouse && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter des produits
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Transférer un produit au stock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Shop Selection */}
                  <div className="space-y-2">
                    <Label>Boutique</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher une boutique..."
                        value={shopSearch}
                        onChange={(e) => setShopSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedShop} onValueChange={setSelectedShop}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une boutique" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredShops.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection */}
                  {selectedShop && (
                    <div className="space-y-2">
                      <Label>Produit</Label>
                      {productsLoading ? (
                        <div className="flex items-center gap-2 py-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </div>
                      ) : availableProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          Aucun produit disponible dans cette boutique
                        </p>
                      ) : (
                        <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center justify-between gap-4 w-full">
                                  <span>{p.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {p.quantity_available || 0} dispo
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Quantity */}
                  {selectedProduct && (
                    <>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Stock actuel chez le vendeur: <strong>{selectedProduct.quantity_available || 0}</strong> unités
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Label>Quantité à transférer</Label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedProduct.quantity_available || 0}
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                        />
                        {formData.quantity > (selectedProduct.quantity_available || 0) && (
                          <p className="text-sm text-destructive">
                            La quantité dépasse le stock disponible
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <Label>Actif</Label>
                    <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Annuler</Button>
                    <Button
                      onClick={() => addStock.mutate({ ...formData, warehouse_id: selectedWarehouse })}
                      disabled={
                        !formData.product_id || 
                        formData.quantity < 1 ||
                        formData.quantity > (selectedProduct?.quantity_available || 0) ||
                        addStock.isPending
                      }
                    >
                      {addStock.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Transférer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Stock table */}
      {selectedWarehouse && (
        <Card>
          <CardHeader>
            <CardTitle>Produits en stock</CardTitle>
            <CardDescription>
              {stock.length} produit{stock.length > 1 ? "s" : ""} dans cet entrepôt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stock.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>Aucun produit dans cet entrepôt</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Boutique</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Stock entrepôt</TableHead>
                    <TableHead>Stock vendeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                            {item.products?.main_media_url ? (
                              <img src={item.products.main_media_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {item.products?.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{item.products?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.products?.shops?.name}</TableCell>
                      <TableCell>{item.products?.price?.toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          defaultValue={item.quantity}
                          className="w-20"
                          onBlur={(e) => updateStock.mutate({ id: item.id, quantity: parseInt(e.target.value) || 0, is_active: item.is_active })}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.products?.quantity_available || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => updateStock.mutate({ id: item.id, quantity: item.quantity, is_active: v })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive" 
                          onClick={() => deleteStock.mutate({ 
                            id: item.id, 
                            productId: item.product_id,
                            quantity: item.quantity 
                          })}
                          title="Retourner au vendeur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}