import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wallet, Clock, CheckCircle, RefreshCcw, Settings, AlertCircle, Play, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PaymentFilters, type PeriodFilter, type TypeFilter } from "@/components/payments/PaymentFilters";
import { RecipientTypeBadge } from "@/components/payments/RecipientTypeBadge";
import { formatCurrency, filterByPeriod, filterByType, exportToCSV, exportToExcel } from "@/components/payments/paymentUtils";

export default function Payments() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const defaultTab = searchParams.get("tab") || "pending";

  // Filters state
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch pending payouts
  const { data: pendingPayouts = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payouts")
        .select("*, order:orders(order_number), booking:service_bookings(id, services(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const recipientIds = [...new Set((data || []).map((p: any) => p.recipient_id).filter(Boolean))];
      let profiles: any[] = [];
      if (recipientIds.length > 0) {
        const { data: pd } = await supabase.from("profiles").select("id, nom_complet, contact").in("id", recipientIds);
        profiles = pd || [];
      }
      return (data || []).map((payout: any) => ({
        ...payout,
        recipient: profiles.find((p: any) => p.id === payout.recipient_id) || null,
      }));
    },
  });

  // Fetch completed payouts
  const { data: completedPayouts = [], isLoading: completedLoading } = useQuery({
    queryKey: ["completed-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payouts")
        .select("*, order:orders(order_number), booking:service_bookings(id, services(name))")
        .eq("status", "paid")
        .order("processed_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const recipientIds = [...new Set((data || []).map((p: any) => p.recipient_id).filter(Boolean))];
      let profiles: any[] = [];
      if (recipientIds.length > 0) {
        const { data: pd } = await supabase.from("profiles").select("id, nom_complet, contact").in("id", recipientIds);
        profiles = pd || [];
      }
      return (data || []).map((payout: any) => ({
        ...payout,
        recipient: profiles.find((p: any) => p.id === payout.recipient_id) || null,
      }));
    },
  });

  // Fetch refunds
  const { data: refunds = [], isLoading: refundsLoading } = useQuery({
    queryKey: ["refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select("*, order:orders(order_number), booking:service_bookings(id, services(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pd } = await supabase.from("profiles").select("id, nom_complet, contact").in("id", userIds);
        profiles = pd || [];
      }
      return (data || []).map((refund: any) => ({
        ...refund,
        user: profiles.find((p: any) => p.id === refund.user_id) || null,
      }));
    },
  });

  // Filtered data
  const filteredPending = useMemo(() => {
    let d = filterByType(pendingPayouts, typeFilter);
    d = filterByPeriod(d, periodFilter, customFrom, customTo);
    return d;
  }, [pendingPayouts, typeFilter, periodFilter, customFrom, customTo]);

  const filteredCompleted = useMemo(() => {
    let d = filterByType(completedPayouts, typeFilter);
    d = filterByPeriod(d, periodFilter, customFrom, customTo, "processed_at");
    return d;
  }, [completedPayouts, typeFilter, periodFilter, customFrom, customTo]);

  const filteredRefunds = useMemo(() => {
    return filterByPeriod(refunds, periodFilter, customFrom, customTo);
  }, [refunds, periodFilter, customFrom, customTo]);

  // Stats
  const totalPending = filteredPending.reduce((s, p) => s + (p.amount || 0), 0);
  const eligibleNow = filteredPending.filter((p) => p.eligible_at && new Date(p.eligible_at) <= new Date());
  const totalEligibleNow = eligibleNow.reduce((s, p) => s + (p.amount || 0), 0);
  const completedThisMonth = filteredCompleted.filter((p) => {
    if (!p.processed_at) return false;
    const d = new Date(p.processed_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalCompletedThisMonth = completedThisMonth.reduce((s, p) => s + (p.amount || 0), 0);

  // Selection
  const eligibleIds = new Set(eligibleNow.map((p) => p.id));
  const selectedEligible = [...selectedIds].filter((id) => eligibleIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEligible.length === eligibleNow.length && eligibleNow.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleNow.map((p) => p.id)));
    }
  };

  const handleMarkAsPaid = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const { error } = await supabase
        .from("pending_payouts")
        .update({ status: "paid", processed_at: new Date().toISOString() })
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

  const handleBulkPay = async () => {
    if (selectedEligible.length === 0) return;
    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("pending_payouts")
        .update({ status: "paid", processed_at: new Date().toISOString() })
        .in("id", selectedEligible);
      if (error) throw error;
      toast.success(`${selectedEligible.length} paiement(s) marqué(s) comme effectué(s)`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pending-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["completed-payouts"] });
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const buildPendingRows = () => filteredPending.map((p) => ({
    Bénéficiaire: p.recipient?.nom_complet || "",
    Contact: p.recipient?.contact || "",
    Type: p.recipient_type === "vendor" ? "Vendeur" : "Livreur",
    Référence: p.order?.order_number || p.booking?.services?.name || "",
    Montant: String(p.amount),
    "Éligible le": p.eligible_at ? format(new Date(p.eligible_at), "dd/MM/yyyy HH:mm") : "",
    Statut: "En attente",
  }));

  const buildCompletedRows = () => filteredCompleted.map((p) => ({
    Bénéficiaire: p.recipient?.nom_complet || "",
    Contact: p.recipient?.contact || "",
    Type: p.recipient_type === "vendor" ? "Vendeur" : "Livreur",
    Référence: p.order?.order_number || p.booking?.services?.name || "",
    Montant: String(p.amount),
    "Payé le": p.processed_at ? format(new Date(p.processed_at), "dd/MM/yyyy HH:mm") : "",
    Statut: "Payé",
  }));

  const buildRefundRows = () => filteredRefunds.map((r: any) => ({
    Client: r.user?.nom_complet || "",
    Contact: r.user?.contact || "",
    Référence: r.order?.order_number || r.booking?.services?.name || "",
    Montant: String(r.amount),
    "Net remboursé": String(r.net_refund),
    Date: format(new Date(r.created_at), "dd/MM/yyyy"),
    Statut: r.refund_status || "—",
  }));

  const d = format(new Date(), "yyyy-MM-dd");

  const handleExportPending = () => exportToCSV(buildPendingRows(), `paiements-en-attente-${d}.csv`);
  const handleExportPendingXlsx = () => exportToExcel(buildPendingRows(), `paiements-en-attente-${d}.xlsx`);

  const handleExportCompleted = () => exportToCSV(buildCompletedRows(), `paiements-effectues-${d}.csv`);
  const handleExportCompletedXlsx = () => exportToExcel(buildCompletedRows(), `paiements-effectues-${d}.xlsx`);

  const handleExportRefunds = () => exportToCSV(buildRefundRows(), `remboursements-${d}.csv`);
  const handleExportRefundsXlsx = () => exportToExcel(buildRefundRows(), `remboursements-${d}.xlsx`);

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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">{filteredPending.length} paiements</p>
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
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">En attente</span> ({filteredPending.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Effectués</span> ({filteredCompleted.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Remboursements</span> ({filteredRefunds.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---- PENDING TAB ---- */}
        <TabsContent value="pending" className="space-y-4">
          <PaymentFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onExportCSV={handleExportPending}
            onExportExcel={handleExportPendingXlsx}
          />

          {selectedEligible.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <span className="text-sm font-medium">{selectedEligible.length} sélectionné(s)</span>
              <Button size="sm" onClick={handleBulkPay} disabled={bulkProcessing}>
                {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Payer la sélection
              </Button>
            </div>
          )}

          {pendingLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredPending.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun paiement en attente</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={eligibleNow.length > 0 && selectedEligible.length === eligibleNow.length}
                          onCheckedChange={toggleAll}
                          disabled={eligibleNow.length === 0}
                        />
                      </TableHead>
                      <TableHead>Bénéficiaire</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Référence</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead className="hidden md:table-cell">Éligible le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((payout: any) => {
                      const isEligible = payout.eligible_at && new Date(payout.eligible_at) <= new Date();
                      return (
                        <TableRow key={payout.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(payout.id)}
                              onCheckedChange={() => toggleSelect(payout.id)}
                              disabled={!isEligible}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payout.recipient?.nom_complet || "—"}</p>
                              <p className="text-xs text-muted-foreground">{payout.recipient?.contact}</p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {payout.order?.order_number || payout.booking?.services?.name || ""}
                              </p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {payout.eligible_at && (
                                  <span className={isEligible ? "text-green-600 font-medium" : ""}>
                                    Élig. {format(new Date(payout.eligible_at), "dd/MM HH:mm", { locale: fr })}
                                  </span>
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell><RecipientTypeBadge type={payout.recipient_type} /></TableCell>
                          <TableCell className="hidden md:table-cell">
                            {payout.order?.order_number || payout.booking?.services?.name || "—"}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {payout.eligible_at ? (
                              <span className={isEligible ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                {format(new Date(payout.eligible_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              disabled={!isEligible || processingId === payout.id}
                              onClick={() => handleMarkAsPaid(payout.id)}
                            >
                              {processingId === payout.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="hidden sm:inline">Marquer payé</span>}
                              {processingId !== payout.id && <CheckCircle className="h-4 w-4 sm:hidden" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ---- COMPLETED TAB ---- */}
        <TabsContent value="completed" className="space-y-4">
          <PaymentFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onExportCSV={handleExportCompleted}
            onExportExcel={handleExportCompletedXlsx}
          />

          {completedLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredCompleted.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun paiement effectué</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bénéficiaire</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Référence</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead className="hidden md:table-cell">Payé le</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompleted.map((payout: any) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.recipient?.nom_complet || "—"}</p>
                            <p className="text-xs text-muted-foreground">{payout.recipient?.contact}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {payout.processed_at && format(new Date(payout.processed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell><RecipientTypeBadge type={payout.recipient_type} /></TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payout.order?.order_number || payout.booking?.services?.name || "—"}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payout.processed_at ? format(new Date(payout.processed_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ---- REFUNDS TAB ---- */}
        <TabsContent value="refunds" className="space-y-4">
          <PaymentFilters
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onExportCSV={handleExportRefunds}
            onExportExcel={handleExportRefundsXlsx}
            showTypeFilter={false}
          />

          {refundsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredRefunds.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun remboursement</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Référence</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead className="hidden sm:table-cell">Net remboursé</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.map((refund: any) => {
                      const canInitiate = refund.status === "pending" && !refund.paystack_refund_id;
                      const canVerify = refund.refund_status === "pending_manual" || (refund.paystack_refund_id && refund.refund_status !== "processed");
                      return (
                        <TableRow key={refund.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{refund.user?.nom_complet || "—"}</p>
                              <p className="text-xs text-muted-foreground">{refund.user?.contact}</p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {format(new Date(refund.created_at), "dd/MM/yyyy", { locale: fr })}
                              </p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                Net: {formatCurrency(refund.net_refund)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {refund.order?.order_number || refund.booking?.services?.name || "—"}
                          </TableCell>
                          <TableCell>{formatCurrency(refund.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell font-medium text-green-600">
                            {formatCurrency(refund.net_refund)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {format(new Date(refund.created_at), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {refund.refund_status ? (
                              <Badge variant={refund.refund_status === "processed" ? "default" : "outline"}>
                                {refund.refund_status === "processed" ? "Traité" :
                                  refund.refund_status === "pending" ? "En attente" :
                                    refund.refund_status === "failed" ? "Échoué" : refund.refund_status}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
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
                                      toast.success("Remboursement enregistré (traitement manuel)");
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
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Paramètres de paiement</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Les paramètres de paiement se trouvent dans{" "}
                <a href="/dashboard/settings" className="text-primary underline">Paramètres → Politiques financières</a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
