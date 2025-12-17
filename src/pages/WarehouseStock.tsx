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
import { Plus, Package, Loader2, Trash2, Edit } from "lucide-react";

export default function WarehouseStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
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
          products(id, name, main_media_url, price, shops(name))
        `)
        .eq("warehouse_id", selectedWarehouse)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWarehouse,
  });

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, main_media_url, price, shops(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Create stock mutation
  const addStock = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("warehouse_stock").insert({
        ...data,
        added_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast.success("Produit ajouté au stock");
      setIsDialogOpen(false);
      setFormData({ warehouse_id: "", product_id: "", quantity: 0, is_active: true });
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Ce produit est déjà dans cet entrepôt");
      } else {
        toast.error("Erreur lors de l'ajout");
      }
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

  // Delete stock mutation
  const deleteStock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouse_stock").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
      toast.success("Produit retiré du stock");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  // Get products not already in selected warehouse
  const stockProductIds = stock.map((s: any) => s.product_id);
  const availableProducts = products.filter((p: any) => !stockProductIds.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion de Stock</h1>
          <p className="text-muted-foreground">Gérez le stock des produits par entrepôt</p>
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un produit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un produit au stock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Produit</Label>
                    <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - {p.shops?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantité en stock</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Actif</Label>
                    <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button
                      onClick={() => addStock.mutate({ ...formData, warehouse_id: selectedWarehouse })}
                      disabled={!formData.product_id || addStock.isPending}
                    >
                      {addStock.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Ajouter
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
                    <TableHead>Quantité</TableHead>
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
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => updateStock.mutate({ id: item.id, quantity: item.quantity, is_active: v })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteStock.mutate(item.id)}>
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