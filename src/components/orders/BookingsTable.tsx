import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { Eye, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  created_at: string;
  status: string;
  payment_status: string;
  total_price: number;
  advance_paid: number;
  customer_id: string;
  services?: { name: string; shops?: { name: string } };
  profiles?: { nom_complet: string; contact: string };
}

interface BookingsTableProps {
  bookings: Booking[];
  onViewDetails: (booking: Booking) => void;
  onMessage: (userId: string) => void;
}

export function BookingsTable({ bookings, onViewDetails, onMessage }: BookingsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date RDV</TableHead>
            <TableHead>Heure</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Avance</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Paiement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Aucune réservation trouvée
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.services?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{booking.services?.shops?.name || "—"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.profiles?.nom_complet || "—"}</div>
                    <div className="text-xs text-muted-foreground">{booking.profiles?.contact || "—"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(booking.booking_date), "dd MMM yyyy", { locale: fr })}
                  </span>
                </TableCell>
                <TableCell>{booking.booking_time?.slice(0, 5) || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(booking.total_price)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(booking.advance_paid || 0)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={booking.status || "pending"} />
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={booking.payment_status || "pending"} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onViewDetails(booking)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {booking.customer_id && (
                      <Button variant="ghost" size="icon" onClick={() => onMessage(booking.customer_id)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}