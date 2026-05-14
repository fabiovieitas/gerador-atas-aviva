import { useMemo } from "react";
import { Users, Clock, LayoutDashboard, Plus, Settings, CircleHelp, LogOut, UserCog, ClipboardList, Globe, Church, ChevronsUpDown, BookOpen, CalendarDays, Rocket, CheckSquare, Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAtaStore } from "@/hooks/useAtaStore";
import { ThemeToggle } from "./ThemeToggle";
import { APP_VERSION } from "@/lib/version";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
const logoAviva = "/logo_aviva.png";
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

const baseItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nova Ata", url: "/nova-ata", icon: Plus },
  { title: "Pendências", url: "/pendencias", icon: CheckSquare },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Pautas", url: "/pautas", icon: ClipboardList },
  { title: "Histórico", url: "/historico", icon: Clock },
  { title: "Membros", url: "/membros", icon: Users },
  { title: "Documentos", url: "/documentos", icon: BookOpen },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Ajuda", url: "/ajuda", icon: CircleHelp },
  { title: "Novidades", url: "/novidades", icon: Rocket },
];

export function AppSidebar({ store }: { store: ReturnType<typeof useAtaStore> }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, isAdmin, isMaster, signOut } = useAuth();
  const menuGroups = useMemo(() => {
    const groups = [
      {
        label: "Secretaria",
        items: [
          { title: "Dashboard", url: "/", icon: LayoutDashboard },
          { title: "Nova Ata", url: "/nova-ata", icon: Plus },
          { title: "Pendências", url: "/pendencias", icon: CheckSquare },
        ]
      },
      {
        label: "Gestão",
        items: [
          { title: "Histórico", url: "/historico", icon: Clock },
          { title: "Membros", url: "/membros", icon: Users },
          { title: "Pautas", url: "/pautas", icon: ClipboardList },
          { title: "Agenda", url: "/agenda", icon: CalendarDays },
          { title: "Documentos", url: "/documentos", icon: BookOpen },
        ]
      }
    ];

    if (isAdmin || isMaster) {
      groups.push({
        label: "Administração",
        items: [
          { title: "Gerenciar Usuários", url: "/gerenciar-usuarios", icon: UserCog },
          { title: "Backup", url: "/backup", icon: Database },
        ]
      });
    }

    groups.push({
      label: "Sistema",
      items: [
        { title: "Configurações", url: "/configuracoes", icon: Settings },
        { title: "Ajuda", url: "/ajuda", icon: CircleHelp },
        { title: "Novidades", url: "/novidades", icon: Rocket },
      ]
    });

    return groups;
  }, [isAdmin, isMaster]);

  const getRoleLabel = () => {
    if (isMaster) return "Master";
    if (isAdmin) return "Admin";
    return "Usuário";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 space-y-3 select-none">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src={logoAviva} alt="Igreja Evangélica Aviva" className="w-11 h-11 rounded-lg object-contain" />
            <div>
              <h2 className="text-base font-bold text-sidebar-foreground">Igreja AVIVA</h2>
              <p className="text-xs text-sidebar-foreground/60 flex items-center gap-2">
                Gerador de Atas <span className="opacity-50">v{APP_VERSION}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider border border-primary/20">BETA</span>
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <img src={logoAviva} alt="Igreja Evangélica Aviva" className="w-10 h-10 rounded-lg object-contain mx-auto" />
        )}
        
        {(isAdmin || isMaster) && !collapsed && (
          <div className="pt-1 pb-1">
            <Select value={store.selectedChurchId || 'all'} onValueChange={store.setSelectedChurchId}>
              <SelectTrigger className="w-full bg-sidebar-accent/30 border-sidebar-border hover:bg-sidebar-accent/50 transition-colors h-10 text-xs font-medium">
                <div className="flex items-center gap-2 truncate">
                  {store.selectedChurchId === 'all' || !store.selectedChurchId ? (
                    <Globe className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Church className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="truncate">
                    {store.selectedChurchId === 'all' || !store.selectedChurchId ? 'Gestão Global' : store.churchInfo?.nome || 'Unidade Local'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Gestão Global</span>
                  </div>
                </SelectItem>
                {store.churches?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <Church className="w-3.5 h-3.5" />
                      <span>{c.nome}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="scrollbar-none">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 px-4 mt-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50 rounded-lg px-3 py-2 text-[0.85rem] flex items-center gap-3 transition-all"
                        activeClassName="bg-primary/10 text-primary font-bold shadow-sm"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
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
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex flex-col gap-2 mb-2 px-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-sidebar-foreground/60 truncate flex-1">{profile?.nome || ''}</p>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                isMaster ? 'border-destructive text-destructive bg-destructive/5' : 
                isAdmin ? 'border-primary text-primary bg-primary/5' : 
                'border-muted-foreground/30 text-muted-foreground'
              }`}>
                {getRoleLabel()}
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-2">
            <ThemeToggle />
          </div>
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
