import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, Search } from "lucide-react";
import { toast } from "sonner";

type ContactRequest = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "new", label: "Nouveau" },
  { value: "read", label: "Lu" },
  { value: "replied", label: "Répondu" },
  { value: "archived", label: "Archivé" },
];

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    new: { label: "Nouveau", variant: "destructive" },
    read: { label: "Lu", variant: "secondary" },
    replied: { label: "Répondu", variant: "default" },
    archived: { label: "Archivé", variant: "outline" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

const ContactRequests = () => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["contact-requests", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data as ContactRequest[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes: string }) => {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status, admin_notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-requests"] });
      toast.success("Demande mise à jour");
      setSelected(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const filtered = requests.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.full_name.toLowerCase().includes(s) || r.subject.toLowerCase().includes(s) || r.phone?.includes(s);
  });

  const openDetail = (req: ContactRequest) => {
    setSelected(req);
    setNotes(req.admin_notes || "");
    setNewStatus(req.status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Demandes de contact</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, sujet, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Téléphone</TableHead>
              <TableHead>Sujet</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucune demande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => (
                <TableRow
                  key={req.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(req)}
                >
                  <TableCell className="text-sm">
                    {format(new Date(req.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="font-medium">{req.full_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {req.phone || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{req.subject}</TableCell>
                  <TableCell>{statusBadge(req.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Demande de {selected.full_name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(selected.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Statut</p>
                    <div className="mt-1">{statusBadge(selected.status)}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{selected.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selected.email || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sujet</p>
                  <p className="font-medium">{selected.subject}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {selected.message}
                  </p>
                </div>

                <div className="border-t pt-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Changer le statut</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes admin</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ajouter une note interne..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        status: newStatus,
                        admin_notes: notes,
                      })
                    }
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ContactRequests;
