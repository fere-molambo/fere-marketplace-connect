import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { PlatformSettings } from "@/components/settings/PlatformSettings";
import { DataManagementSettings } from "@/components/settings/DataManagementSettings";
import { TeamTagsSettings } from "@/components/settings/TeamTagsSettings";
import { HomepageSettings } from "@/components/settings/HomepageSettings";
import { HelpSettings } from "@/components/settings/HelpSettings";
import { AIIntegrationsSettings } from "@/components/settings/AIIntegrationsSettings";
import { CancellationSettings } from "@/components/settings/CancellationSettings";
import { FinancialPoliciesSettings } from "@/components/settings/FinancialPoliciesSettings";
import { User, KeyRound, Building2, Database, Tags, Home, HelpCircle, Sparkles, XCircle, Coins } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function Settings() {
  const { roles } = useUserRoles();
  const canManagePlatform = roles?.includes("super_admin") || roles?.includes("admin");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">
          Gérez vos préférences et votre compte
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Mot de passe</span>
            </TabsTrigger>
            {canManagePlatform && (
              <TabsTrigger value="platform" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Plateforme</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="homepage" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Page d'accueil</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Données</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="team-tags" className="flex items-center gap-2">
                <Tags className="h-4 w-4" />
                <span className="hidden sm:inline">Tags équipe</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Aide & Tutos</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Intégrations IA</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="cancellations" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Annulations</span>
              </TabsTrigger>
            )}
            {canManagePlatform && (
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Politiques financières</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="password" className="mt-6">
          <PasswordSettings />
        </TabsContent>
        {canManagePlatform && (
          <TabsContent value="platform" className="mt-6">
            <PlatformSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="homepage" className="mt-6">
            <HomepageSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="data" className="mt-6">
            <DataManagementSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="team-tags" className="mt-6">
            <TeamTagsSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="help" className="mt-6">
            <HelpSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="ai" className="mt-6">
            <AIIntegrationsSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="cancellations" className="mt-6">
            <CancellationSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="financial" className="mt-6">
            <FinancialPoliciesSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
