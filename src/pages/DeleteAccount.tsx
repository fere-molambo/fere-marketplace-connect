import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && !contactInfo.trim()) {
      toast.error("Veuillez fournir un numéro de téléphone ou email");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: user?.id || null,
          contact_info: user ? null : contactInfo.trim(),
          reason: reason.trim() || null,
        } as any);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      toast.error("Erreur lors de l'envoi de la demande");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Demande enregistrée</h2>
            <p className="text-muted-foreground">
              Votre demande de suppression de compte a été enregistrée. 
              L'équipe Fere vous contactera dans un délai de 30 jours pour traiter votre demande.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-fit -ml-2 mb-2"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Accueil
          </Button>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer mon compte
          </CardTitle>
          <CardDescription>
            Demandez la suppression de votre compte et de toutes vos données associées. 
            Cette action est irréversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="contact">Téléphone ou email *</Label>
                <Input
                  id="contact"
                  placeholder="+223 70 00 00 00 ou email@exemple.com"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nous utiliserons cette information pour identifier votre compte.
                </p>
              </div>
            )}

            {user && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Connecté en tant que : <span className="font-medium text-foreground">{user.email || user.phone}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                <strong>Attention :</strong> La suppression de votre compte entraînera la suppression 
                définitive de toutes vos données : commandes, messages, favoris, boutiques et produits.
              </p>
            </div>

            <Button 
              type="submit" 
              variant="destructive" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Envoi en cours..." : "Envoyer la demande de suppression"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
