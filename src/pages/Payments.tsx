import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Clock, CheckCircle, RefreshCcw, Settings, AlertCircle, Play, Eye, Ban } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Payments() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const defaultTab = searchParams.get("tab") || "pending";

  // Fetch pending payouts
  const { data: pendingPayouts = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payouts")
        .select(`
          *,
          recipient:profiles!pending_payouts_recipient_id_fkey(nom_complet, contact),
          order:orders(order_number),
          booking:service_bookings(id, services(name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch completed payouts
  const { data: completedPayouts = [], isLoading: completedLoading } = useQuery({
    queryKey: ["completed-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payouts")
        .select(`
          *,
          recipient:profiles!pending_payouts_recipient_id_fkey(nom_complet, contact),
          order:orders(order_number),
          booking:service_bookings(id, services(name))
        `)
        .eq("status", "paid")
        .order("processed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch refunds
  const { data: refunds = [], isLoading: refundsLoading } = useQuery({
    queryKey: ["refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select(`
          *,
          order:orders(order_number),
          booking:service_bookings(id, services(name))
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nom_complet, contact")
          .in("id", userIds);
        profiles = profilesData || [];
      }

      return (data || []).map((refund: any) => ({
        ...refund,
        user: profiles.find((p: any) => p.id === refund.user_id) || null,
      }));
    },
  });

  // Stats
  const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const eligibleNow = pendingPayouts.filter(p => 
    p.eligible_at && new Date(p.eligible_at) <= new Date()
  );
  const totalEligibleNow = eligibleNow.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedThisMonth = completedPayouts.filter(p => {
    if (!p.processed_at) return false;
    const processedDate = new Date(p.processed_at);
    const now = new Date();
    return processedDate.getMonth() === now.getMonth() && processedDate.getFullYear() === now.getFullYear();
  });
  const totalCompletedThisMonth = completedThisMonth.reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const { error } = await supabase
        .from("pending_payouts")
        .update({
          status: "paid",
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;
      toast.success("Paiement marqué comme effectué");
      queryClient.invalidateQueries({ queryKey: ["pending-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["completed-payouts"] });
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="mr-1 h-3 w-3" />En attente</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="mr-1 h-3 w-3 animate-spin" />En cours</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Payé</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Échoué</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Remboursé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paiements</h1>
        <p className="text-muted-foreground">Gérez les paiements aux vendeurs et livreurs</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">{pendingPayouts.length} paiements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éligibles maintenant</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEligibleNow)}</div>
            <p className="text-xs text-muted-foreground">{eligibleNow.length} paiements prêts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payé ce mois</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCompletedThisMonth)}</div>
            <p className="text-xs text-muted-foreground">{completedThisMonth.length} paiements</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            En attente ({pendingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Effectués ({completedPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Remboursements ({refunds.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingPayouts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun paiement en attente
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Éligible le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout: any) => {
                    const isEligible = payout.eligible_at && new Date(payout.eligible_at) <= new Date();
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.recipient?.nom_complet || "—"}</p>
                            <p className="text-xs text-muted-foreground">{payout.recipient?.contact}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payout.recipient_type === "vendor" ? "Vendeur" : "Livreur"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payout.order?.order_number || payout.booking?.services?.name || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell>
                          {payout.eligible_at ? (
                            <span className={isEligible ? "text-green-600 font-medium" : "text-muted-foreground"}>
                              {format(new Date(payout.eligible_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            disabled={!isEligible || processingId === payout.id}
                            onClick={() => handleMarkAsPaid(payout.id)}
                          >
                            {processingId === payout.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Marquer payé"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : completedPayouts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun paiement effectué
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Payé le</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedPayouts.map((payout: any) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.recipient?.nom_complet || "—"}</p>
                          <p className="text-xs text-muted-foreground">{payout.recipient?.contact}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payout.recipient_type === "vendor" ? "Vendeur" : "Livreur"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.order?.order_number || payout.booking?.services?.name || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.amount)}
                      </TableCell>
                      <TableCell>
                        {payout.processed_at
                          ? format(new Date(payout.processed_at), "dd/MM/yyyy HH:mm", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="refunds">
          {refundsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : refunds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun remboursement
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Net remboursé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut Paystack</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund: any) => {
                    const canInitiate = refund.status === "pending" && !refund.paystack_refund_id && refund.original_payment_reference;
                    const canVerify = refund.paystack_refund_id && refund.refund_status !== "processed";
                    
                    return (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{refund.user?.nom_complet || "—"}</p>
                            <p className="text-xs text-muted-foreground">{refund.user?.contact}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {refund.order?.order_number || refund.booking?.services?.name || "—"}
                        </TableCell>
                        <TableCell>{formatCurrency(refund.amount)}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(refund.net_refund)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(refund.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {refund.refund_status ? (
                            <Badge variant={refund.refund_status === "processed" ? "default" : "outline"}>
                              {refund.refund_status === "processed" ? "Traité" : 
                               refund.refund_status === "pending" ? "En attente" :
                               refund.refund_status === "failed" ? "Échoué" : refund.refund_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canInitiate && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processingId === refund.id}
                                onClick={async () => {
                                  setProcessingId(refund.id);
                                  try {
                                    const res = await supabase.functions.invoke("process-refund", {
                                      body: { action: "initiate", refund_id: refund.id },
                                    });
                                    if (res.error) throw res.error;
                                    toast.success("Remboursement initié sur Paystack");
                                    queryClient.invalidateQueries({ queryKey: ["refunds"] });
                                  } catch (e: any) {
                                    toast.error("Erreur: " + e.message);
                                  } finally {
                                    setProcessingId(null);
                                  }
                                }}
                              >
                                {processingId === refund.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                              </Button>
                            )}
                            {canVerify && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={processingId === refund.id}
                                onClick={async () => {
                                  setProcessingId(refund.id);
                                  try {
                                    const res = await supabase.functions.invoke("process-refund", {
                                      body: { action: "verify", refund_id: refund.id },
                                    });
                                    if (res.error) throw res.error;
                                    toast.success("Statut mis à jour");
                                    queryClient.invalidateQueries({ queryKey: ["refunds"] });
                                  } catch (e: any) {
                                    toast.error("Erreur: " + e.message);
                                  } finally {
                                    setProcessingId(null);
                                  }
                                }}
                              >
                                {processingId === refund.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Les paramètres de paiement se trouvent dans{" "}
                <a href="/dashboard/settings" className="text-primary underline">
                  Paramètres → Politiques financières
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
