import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function FinancialPoliciesSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [penaltyRate, setPenaltyRate] = useState<number>(10);
  
  const [payoutDelay, setPayoutDelay] = useState<number>(24);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings-financial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("cancellation_penalty_rate, payout_delay_hours")
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setPenaltyRate(settings.cancellation_penalty_rate ?? 10);
      setPayoutDelay(settings.payout_delay_hours ?? 24);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          cancellation_penalty_rate: penaltyRate,
          payout_delay_hours: payoutDelay,
        })
        .eq("id", (await supabase.from("platform_settings").select("id").single()).data?.id);

      if (error) throw error;
      toast.success("Politiques financières mises à jour");
      queryClient.invalidateQueries({ queryKey: ["platform-settings-financial"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Annulations et pénalités</CardTitle>
          <CardDescription>
            Configurez les règles de pénalité pour les annulations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="penaltyRate">Taux de pénalité d'annulation (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="penaltyRate"
                type="number"
                min="0"
                max="100"
                value={penaltyRate}
                onChange={(e) => setPenaltyRate(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pourcentage du montant de la commande appliqué en pénalité lors d'une annulation abusive
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements vendeurs et livreurs</CardTitle>
          <CardDescription>
            Délai avant que les fonds soient libérés aux bénéficiaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payoutDelay">Délai avant paiement (heures)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="payoutDelay"
                type="number"
                min="0"
                max="168"
                value={payoutDelay}
                onChange={(e) => setPayoutDelay(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">heures</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Temps d'attente après livraison/service complété avant que le paiement soit éligible (0 = immédiat)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
