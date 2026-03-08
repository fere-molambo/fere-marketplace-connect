import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RefundsSectionProps {
  userId: string;
}

export function RefundsSection({ userId }: RefundsSectionProps) {
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["client-refunds", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select(`
          *,
          order:orders(order_number),
          booking:service_bookings(id, service_id)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch service names for booking refunds
      const bookingIds = data
        ?.filter((r: any) => r.booking?.service_id)
        .map((r: any) => r.booking.service_id) || [];

      let serviceMap: Record<string, string> = {};
      if (bookingIds.length > 0) {
        const { data: services } = await supabase
          .from("services")
          .select("id, name")
          .in("id", bookingIds);
        if (services) {
          serviceMap = Object.fromEntries(services.map((s: any) => [s.id, s.name]));
        }
      }

      return data?.map((r: any) => ({
        ...r,
        _serviceName: r.booking?.service_id ? serviceMap[r.booking.service_id] : null,
      })) || [];
    },
    enabled: !!userId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const getStatusBadge = (status: string, refundStatus: string | null) => {
    const effectiveStatus = refundStatus || status;
    
    switch (effectiveStatus) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <RefreshCcw className="mr-1 h-3 w-3" />
            En cours
          </Badge>
        );
      case "processed":
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Remboursé
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Échoué
          </Badge>
        );
      default:
        return <Badge variant="outline">{effectiveStatus}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Aucun remboursement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Mes remboursements
        </CardTitle>
        <CardDescription>
          Historique de vos remboursements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {refunds.map((refund: any) => (
            <div
              key={refund.id}
              className="p-4 rounded-lg border space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {refund._serviceName
                      ? `Service: ${refund._serviceName}`
                      : refund.order?.order_number || "Commande"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(refund.created_at), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                {getStatusBadge(refund.status, refund.refund_status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Montant initial:</span>
                  <p className="font-medium">{formatCurrency(refund.amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Montant remboursé:</span>
                  <p className="font-medium text-green-600">{formatCurrency(refund.net_refund)}</p>
                </div>
              </div>

              {refund.transaction_fee_deducted > 0 && (
                <p className="text-xs text-muted-foreground">
                  Frais de livraison conservés: {formatCurrency(refund.transaction_fee_deducted)}
                </p>
              )}

              {refund.failure_reason && (
                <p className="text-xs text-destructive">
                  Raison: {refund.failure_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
