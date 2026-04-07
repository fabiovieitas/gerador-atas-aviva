import { Users, Clock, LayoutDashboard, Plus, Settings } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nova Ata", url: "/nova-ata", icon: Plus },
  { title: "Histórico", url: "/historico", icon: Clock },
  { title: "Membros", url: "/membros", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src={logoAviva} alt="Igreja Evangélica Aviva" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">Igreja AVIVA</h2>
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
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
