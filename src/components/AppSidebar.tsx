import { Users, Clock, LayoutDashboard, Plus, Settings, CircleHelp, LogOut } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoAviva from "@/assets/logo_aviva.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nova Ata", url: "/nova-ata", icon: Plus },
  { title: "Histórico", url: "/historico", icon: Clock },
  { title: "Membros", url: "/membros", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Ajuda", url: "/ajuda", icon: CircleHelp },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src={logoAviva} alt="Igreja Evangélica Aviva" className="w-11 h-11 rounded-lg object-contain" />
            <div>
              <h2 className="text-base font-bold text-sidebar-foreground">Igreja AVIVA</h2>
              <p className="text-xs text-sidebar-foreground/60">Gerador de Atas <span className="opacity-50">v{APP_VERSION}</span></p>
            </div>
          </div>
        )}
        {collapsed && (
          <img src={logoAviva} alt="Igreja Evangélica Aviva" className="w-10 h-10 rounded-lg object-contain mx-auto" />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/40 mb-1">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 rounded-lg px-3 py-2.5 text-[0.9rem]"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && profile && (
          <p className="text-xs text-sidebar-foreground/60 mb-2 truncate px-1">{profile.nome}</p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="h-10 text-destructive hover:bg-destructive/10 rounded-lg">
              <LogOut className="mr-3 h-4 w-4" />
              {!collapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
