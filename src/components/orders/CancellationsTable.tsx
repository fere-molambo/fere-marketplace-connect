import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Package, Calendar, RefreshCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CancellationsTableProps {
  cancellations: any[];
  refunds?: any[];
  onViewOrder?: (orderId: string) => void;
  onViewBooking?: (bookingId: string) => void;
}

export function CancellationsTable({ cancellations, refunds = [], onViewOrder, onViewBooking }: CancellationsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const getRefundForCancellation = (cancellationId: string) => {
    return refunds.find((r: any) => r.cancellation_id === cancellationId);
  };

  const getRefundStatusBadge = (refund: any) => {
    if (!refund) return <span className="text-muted-foreground">—</span>;
    const status = refund.refund_status || refund.status;
    switch (status) {
      case "processed":
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><RefreshCcw className="mr-1 h-3 w-3" />Remboursé</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-700"><RefreshCcw className="mr-1 h-3 w-3" />En cours</Badge>;
      case "failed":
        return <Badge variant="destructive"><RefreshCcw className="mr-1 h-3 w-3" />Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCancellerLabel = (role: string) => {
    switch (role) {
      case "client": return "Client";
      case "driver": return "Livreur";
      case "vendor": return "Vendeur";
      case "admin": return "Admin";
      default: return role;
    }
  };

  if (cancellations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune annulation trouvée
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Référence</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Motif</TableHead>
          <TableHead>Annulé par</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Statut remboursement</TableHead>
          <TableHead>Pénalité</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cancellations.map((cancellation: any) => {
          const isOrder = !!cancellation.order_id;
          const reference = isOrder 
            ? cancellation.order?.order_number 
            : cancellation.booking?.services?.name;
          const clientName = isOrder
            ? cancellation.order?.profiles?.nom_complet
            : cancellation.booking?.profiles?.nom_complet;
          const refund = getRefundForCancellation(cancellation.id);

          return (
            <TableRow key={cancellation.id}>
              <TableCell>
                {format(new Date(cancellation.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {isOrder ? (
                    <><Package className="mr-1 h-3 w-3" />Produit</>
                  ) : (
                    <><Calendar className="mr-1 h-3 w-3" />Service</>
                  )}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {reference || "—"}
              </TableCell>
              <TableCell>
                {clientName || "—"}
              </TableCell>
              <TableCell>
                <span className="max-w-[150px] truncate block">
                  {cancellation.reason?.label || cancellation.custom_reason || "—"}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {getCancellerLabel(cancellation.canceller_role)}
                </Badge>
              </TableCell>
              <TableCell>
                {refund ? (
                  <span className="text-green-600">{formatCurrency(refund.net_refund)}</span>
                ) : cancellation.refund_amount > 0 ? (
                  <span className="text-green-600">{formatCurrency(cancellation.refund_amount)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {getRefundStatusBadge(refund)}
              </TableCell>
              <TableCell>
                {cancellation.penalty_amount > 0 ? (
                  <span className="text-red-600">{formatCurrency(cancellation.penalty_amount)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isOrder && onViewOrder) {
                      onViewOrder(cancellation.order_id);
                    } else if (!isOrder && onViewBooking) {
                      onViewBooking(cancellation.booking_id);
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
