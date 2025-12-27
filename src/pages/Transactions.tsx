import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Receipt, Search, Filter, Coins, ShoppingBag, Briefcase } from "lucide-react";
import { useState } from "react";

type TransactionType = "all" | "order" | "service_booking" | "tokens" | "commission_payout" | "subscription";

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState<TransactionType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["admin-transactions", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("payment_transactions")
        .select(`
          *,
          user:profiles!user_id (nom_complet, email, contact)
        `)
        .order("created_at", { ascending: false } as any)
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("payment_type", typeFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["transaction-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("payment_type, amount, status")
        .eq("status", "success");

      if (error) throw error;

      const totals = {
        orders: 0,
        services: 0,
        tokens: 0,
        total: 0,
      };

      data?.forEach((tx) => {
        totals.total += tx.amount;
        const paymentType = tx.payment_type as string;
        switch (paymentType) {
          case "order":
            totals.orders += tx.amount;
            break;
          case "service_booking":
            totals.services += tx.amount;
            break;
          case "tokens":
            totals.tokens += tx.amount;
            break;
        }
      });

      return totals;
    },
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "order":
        return (
          <Badge variant="default" className="gap-1">
            <ShoppingBag className="h-3 w-3" />
            Commande
          </Badge>
        );
      case "service_booking":
        return (
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="h-3 w-3" />
            Service
          </Badge>
        );
      case "tokens":
        return (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
            <Coins className="h-3 w-3" />
            Tokens
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Réussi</Badge>;
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "failed":
        return <Badge variant="destructive">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.reference.toLowerCase().includes(query) ||
      tx.user?.nom_complet?.toLowerCase().includes(query) ||
      tx.user?.email?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Transactions
        </h1>
        <p className="text-muted-foreground">
          Historique des paiements sur la plateforme
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total réussi</CardDescription>
            <CardTitle className="text-2xl">{stats?.total.toLocaleString()} FCFA</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Commandes</CardDescription>
            <CardTitle className="text-xl text-primary">{stats?.orders.toLocaleString()} FCFA</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Services</CardDescription>
            <CardTitle className="text-xl text-secondary-foreground">{stats?.services.toLocaleString()} FCFA</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens</CardDescription>
            <CardTitle className="text-xl text-amber-600">{stats?.tokens.toLocaleString()} FCFA</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="order">Commandes</SelectItem>
                  <SelectItem value="service_booking">Services</SelectItem>
                  <SelectItem value="tokens">Tokens</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                      <TableCell>{getTypeBadge(tx.payment_type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.user?.nom_complet || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">{tx.user?.contact}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {tx.amount.toLocaleString()} {tx.currency}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
