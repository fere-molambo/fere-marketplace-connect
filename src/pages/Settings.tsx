import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { PlatformSettings } from "@/components/settings/PlatformSettings";
import { DataManagementSettings } from "@/components/settings/DataManagementSettings";
import { TeamTagsSettings } from "@/components/settings/TeamTagsSettings";
import { User, KeyRound, Building2, Database, Tags } from "lucide-react";
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
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Mot de passe
          </TabsTrigger>
          {canManagePlatform && (
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Plateforme
            </TabsTrigger>
          )}
          {canManagePlatform && (
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Données
            </TabsTrigger>
          )}
          {canManagePlatform && (
            <TabsTrigger value="team-tags" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Tags équipe
            </TabsTrigger>
          )}
        </TabsList>
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
          <TabsContent value="data" className="mt-6">
            <DataManagementSettings />
          </TabsContent>
        )}
        {canManagePlatform && (
          <TabsContent value="team-tags" className="mt-6">
            <TeamTagsSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
