import { DashboardLayout } from "@/components/DashboardLayout";
import { useAtaStore } from "@/hooks/useAtaStore";
import { Routes, Route, useNavigate } from "react-router-dom";
import { DashboardPage } from "@/pages/Dashboard";
import { NovaAtaPage } from "@/pages/NovaAta";
import { HistoricoPage } from "@/pages/Historico";
import { MembrosPage } from "@/pages/Membros";
import { ConfiguracoesPage } from "@/pages/Configuracoes";
import { AjudaPage } from "@/pages/Ajuda";

export function AppRoutes() {
  const store = useAtaStore();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardPage store={store} />} />
        <Route path="/nova-ata" element={<NovaAtaPage store={store} />} />
        <Route path="/historico" element={<HistoricoPage store={store} onCarregar={() => navigate('/nova-ata')} />} />
        <Route path="/membros" element={<MembrosPage store={store} />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage store={store} />} />
        <Route path="/ajuda" element={<AjudaPage />} />
      </Routes>
    </DashboardLayout>
  );
}
