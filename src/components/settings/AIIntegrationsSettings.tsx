import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, Lock, Sparkles, Image as ImageIcon, MessageSquare } from "lucide-react";

export const AIIntegrationsSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Intégrations IA</h3>
        <p className="text-sm text-muted-foreground">
          Gérez les services d'intelligence artificielle disponibles sur la plateforme
        </p>
      </div>

      {/* Active Integration - Lovable AI */}
      <Card className="border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Lovable AI</CardTitle>
                <CardDescription>Gemini 2.5 Flash - Génération d'images</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Actif
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span>Génération d'affiches marketing</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce service est automatiquement configuré et prêt à l'emploi. Aucune configuration requise.
              Les vendeurs peuvent générer des affiches marketing pour leur boutique depuis l'onglet Marketing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future Integrations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">Prochainement disponibles</h4>
          <Badge variant="outline" className="text-xs">Premium</Badge>
        </div>

        {/* OpenAI */}
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">OpenAI</CardTitle>
                  <CardDescription>GPT-5, DALL-E 3</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Verrouillé
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key" className="text-muted-foreground">Clé API OpenAI</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                disabled
                className="bg-muted"
              />
            </div>
            <Button disabled className="w-full">
              Disponible avec l'abonnement Premium
            </Button>
          </CardContent>
        </Card>

        {/* Google Cloud AI */}
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Cloud AI</CardTitle>
                  <CardDescription>Gemini Pro, Imagen 3</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Verrouillé
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-key" className="text-muted-foreground">Clé API Google Cloud</Label>
              <Input
                id="google-key"
                type="password"
                placeholder="AIza..."
                disabled
                className="bg-muted"
              />
            </div>
            <Button disabled className="w-full">
              Disponible avec l'abonnement Premium
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <p>
          Les intégrations premium permettront aux vendeurs d'accéder à des modèles IA plus avancés
          pour la génération d'images, de textes et de vidéos marketing.
        </p>
        <p className="mt-2 font-medium">
          Bientôt disponible avec les abonnements.
        </p>
      </div>
    </div>
  );
};
