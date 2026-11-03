import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ENTITY_LABEL: Record<string, string> = {
  profiles: "Livreur / utilisateur",
  shops: "Boutique",
  user_roles: "Rôle",
  platform_settings: "Paramètres",
  category_commissions: "Commission",
};

const ACTION_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  insert: { label: "Création", variant: "default" },
  update: { label: "Modification", variant: "secondary" },
  delete: { label: "Suppression", variant: "destructive" },
};

/** Les champs techniques n'apprennent rien à un lecteur humain. */
const HIDDEN_FIELDS = new Set(["updated_at", "created_at", "id"]);

function describeChanges(action: string, changes: any): string {
  if (!changes || typeof changes !== "object") return "—";

  if (action === "update") {
    const parts = Object.entries(changes)
      .filter(([key]) => !HIDDEN_FIELDS.has(key))
      .map(([key, value]: [string, any]) => {
        const before = value?.avant;
        const after = value?.apres;
        const fmt = (v: any) =>
          v === null || v === undefined || v === "" ? "vide" : String(v).slice(0, 60);
        return `${key} : ${fmt(before)} → ${fmt(after)}`;
      });
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  const keys = Object.keys(changes).filter((k) => !HIDDEN_FIELDS.has(k));
  return keys.slice(0, 4).map((k) => `${k} : ${String(changes[k]).slice(0, 40)}`).join(" · ") || "—";
}

export function AuditLogTab() {
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_log")
        .select("id, actor_id, action, entity_type, entity_id, changes, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = data || [];
      const actorIds = Array.from(
        new Set(rows.map((r: any) => r.actor_id).filter(Boolean)),
      );

      let names = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nom_complet")
          .in("id", actorIds as string[]);
        names = new Map((profiles || []).map((p: any) => [p.id, p.nom_complet]));
      }

      return rows.map((r: any) => ({ ...r, actor_name: names.get(r.actor_id) || null }));
    },
  });

  const filtered = entries.filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.actor_name?.toLowerCase().includes(q) ||
      ENTITY_LABEL[e.entity_type]?.toLowerCase().includes(q) ||
      e.entity_type?.toLowerCase().includes(q) ||
      JSON.stringify(e.changes || {}).toLowerCase().includes(q)
    );
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Journal des actions
        </CardTitle>
        <CardDescription>
          Qui a validé, modifié ou supprimé quoi, et quand. Le journal ne peut être ni modifié ni
          effacé, y compris par un super administrateur : c'est ce qui lui donne sa valeur de preuve.
          200 dernières entrées.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucune action enregistrée pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => {
                  const action = ACTION_LABEL[e.action] ?? {
                    label: e.action,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(e.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.actor_name || <span className="text-muted-foreground">Système</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={action.variant}>{action.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ENTITY_LABEL[e.entity_type] || e.entity_type}
                      </TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">
                        {describeChanges(e.action, e.changes)}
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
}
