import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const getNavigationItems = (roles: string[]) => {
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin");
  const isVendeur = roles.includes("vendeur");

  const gestionItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  ];

  // Super admin, admin et vendeur voient les utilisateurs
  if (isSuperAdmin || isAdmin || isVendeur) {
    gestionItems.push({ title: "Utilisateurs", icon: Users, href: "/dashboard/users" });
  }

  return [
    {
      title: "GESTION",
      items: gestionItems,
    },
    {
      title: "SYSTÈME",
      items: [
        { title: "Paramètres", icon: Settings, href: "/dashboard/settings" },
      ],
    },
  ];
};

export const AppSidebar = () => {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const navigationItems = getNavigationItems(roles || []);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    vendeur: "Vendeur",
    livreur: "Livreur",
    membre: "Membre",
    equipe: "Équipe",
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <img src="/src/assets/fere-logo.webp" alt="Fere" className="h-8 w-8" />
            {!collapsed && <span className="font-bold text-lg text-primary">Fere</span>}
          </div>
        </div>

        {navigationItems.map((section) => (
          <SidebarGroup key={section.title}>
            {!collapsed && <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.href} 
                        end={item.href === "/dashboard"}
                        className="flex items-center gap-3 hover:bg-accent transition-colors"
                        activeClassName="bg-primary text-primary-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarImage src={user?.user_metadata?.photo_profil} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user?.user_metadata?.nom_complet || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.nom_complet || "Utilisateur"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {roles?.[0] ? roleLabels[roles[0]] : ""}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
