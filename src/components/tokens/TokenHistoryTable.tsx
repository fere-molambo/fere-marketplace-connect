import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

export const TokenHistoryTable = () => {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["token-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("token_transactions")
        .select(`
          *,
          service_booking:service_bookings (
            id,
            service:services (name)
          ),
          order:orders (
            id,
            order_number
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getTransactionBadge = (type: string, amount: number) => {
    if (type === "purchase" || amount > 0) {
      return (
        <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
          <ArrowUpCircle className="h-3 w-3" />
          Achat
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <ArrowDownCircle className="h-3 w-3" />
        Commission
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des tokens
        </CardTitle>
        <CardDescription>
          Vos dernières transactions de tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune transaction pour le moment</p>
            <p className="text-sm">Achetez des tokens pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Solde après</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => {
                  // Determine reference display
                  const referenceDisplay = tx.reference_type === 'service_booking' && tx.service_booking?.service?.name
                    ? tx.service_booking.service.name
                    : tx.reference_type === 'order' && tx.order?.order_number
                    ? `Cmd ${tx.order.order_number}`
                    : tx.reference_type === 'delivery_request'
                    ? "Livraison"
                    : "-";
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.created_at!), "dd MMM yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {getTransactionBadge(tx.type, tx.amount)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                        {referenceDisplay}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {tx.balance_after.toLocaleString()} FCFA
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
