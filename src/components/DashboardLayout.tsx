import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useAtaStore } from "@/hooks/useAtaStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Church } from "lucide-react";

export function DashboardLayout({ children, store }: { children: React.ReactNode, store: ReturnType<typeof useAtaStore> }) {
  const { isAdmin, isMaster } = useAuth();
  const showChurchSelector = (isAdmin || isMaster) && (store.churches?.length ?? 0) > 1;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar store={store} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0 justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger />
              <h1 className="text-base font-semibold text-foreground font-display truncate hidden sm:block">
                Gerador de Atas – Igreja AVIVA
              </h1>
            </div>
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
