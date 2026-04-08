import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <h1 className="text-base font-semibold text-foreground font-display">
              Gerador de Atas – Igreja AVIVA
            </h1>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
          <footer className="border-t bg-card px-4 py-2 text-center text-xs text-muted-foreground">
            Desenvolvido por Presbítero Fábio Vieitas Marques.
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
