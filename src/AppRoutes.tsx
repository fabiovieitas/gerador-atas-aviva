import { DashboardLayout } from "@/components/DashboardLayout";
import { useAtaStore } from "@/hooks/useAtaStore";
import { useAuth } from "@/hooks/useAuth";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { DashboardPage } from "@/pages/Dashboard";
import { NovaAtaPage } from "@/pages/NovaAta";
import { HistoricoPage } from "@/pages/Historico";
import { MembrosPage } from "@/pages/Membros";
import { ConfiguracoesPage } from "@/pages/Configuracoes";
import { AjudaPage } from "@/pages/Ajuda";
import { LoginPage } from "@/pages/Login";
import { CadastroPage } from "@/pages/Cadastro";
import { EsqueciSenhaPage } from "@/pages/EsqueciSenha";
import { RedefinirSenhaPage } from "@/pages/RedefinirSenha";

function ProtectedRoutes() {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/cadastro" element={user ? <Navigate to="/" replace /> : <CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route path="/*" element={user ? <ProtectedRoutes /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
