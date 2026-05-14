
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
import { NovidadesPage } from "@/pages/Novidades";
import { GerenciarUsuariosPage } from "@/pages/GerenciarUsuarios";
import { PautasPage } from "@/pages/Pautas";
import { DocumentosPage } from "@/pages/Documentos";
import { AgendaPage } from "@/pages/Agenda";
import { LoginPage } from "@/pages/Login";
import { CadastroPage } from "@/pages/Cadastro";
import { EsqueciSenhaPage } from "@/pages/EsqueciSenha";
import { RedefinirSenhaPage } from "@/pages/RedefinirSenha";
import { ForcarTrocaSenhaPage } from "@/pages/ForcarTrocaSenha";
import { MarcarPresencaPage } from "@/pages/MarcarPresenca";
import { PendenciasPage } from "@/pages/Pendencias";
import { BackupPage } from "@/pages/Backup";

function ProtectedRoutes() {
  const store = useAtaStore();
  const { profile } = useAuth();

  // Se o usuário estiver marcado para troca obrigatória, ele NÃO acessa as rotas protegidas
  if (profile?.force_password_change) {
    return <ForcarTrocaSenhaPage />;
  }

  return (
    <DashboardLayout store={store}>
      <Routes>
        <Route path="/" element={<DashboardPage store={store} />} />
        <Route path="/nova-ata" element={<NovaAtaPage store={store} />} />
        <Route path="/historico" element={<HistoricoPage store={store} />} />
        <Route path="/pendencias" element={<PendenciasPage store={store} />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/pautas" element={<PautasPage store={store} />} />
        <Route path="/documentos" element={<DocumentosPage store={store} />} />
        <Route path="/agenda" element={<AgendaPage store={store} />} />
        <Route path="/membros" element={<MembrosPage store={store} />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage store={store} />} />
        <Route path="/gerenciar-usuarios" element={<GerenciarUsuariosPage store={store} />} />
        <Route path="/ajuda" element={<AjudaPage />} />
        <Route path="/novidades" element={<NovidadesPage />} />
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
      <Route path="/marcar-presenca/:token" element={<MarcarPresencaPage />} />
      <Route path="/*" element={user ? <ProtectedRoutes /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
