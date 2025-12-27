import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Eye, MessageSquare, Truck, Banknote, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  delivery_type: string;
  total_amount: number;
  advance_paid: number;
  user_id: string;
  profiles?: { nom_complet: string; contact: string } | null;
  order_items?: Array<{
    id?: string;
    shop_id?: string;
    shops?: { name: string; delivery_zone_id?: string; delivery_zones?: { name: string } | null } | null;
  }>;
}

interface OrdersTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onMessage: (userId: string) => void;
  showVendorActions?: boolean;
}

export function OrdersTable({ orders, onViewDetails, onMessage }: OrdersTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Payé</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Paiement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Aucune commande trouvée
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const zone = order.order_items?.[0]?.shops?.delivery_zones?.name;
              const isCash = order.payment_method === "cash";
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.profiles?.nom_complet || "—"}</div>
                      <div className="text-xs text-muted-foreground">{order.profiles?.contact || "—"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{zone || "—"}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={isCash ? "text-muted-foreground" : "text-green-600"}>
                      {formatCurrency(order.advance_paid || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <PaymentStatusBadge status={order.payment_status} />
                      {isCash ? (
                        <Badge variant="outline" className="text-xs w-fit">
                          <Banknote className="h-3 w-3 mr-1" />Cash
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs w-fit">
                          <CreditCard className="h-3 w-3 mr-1" />100%
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onViewDetails(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onMessage(order.user_id)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
