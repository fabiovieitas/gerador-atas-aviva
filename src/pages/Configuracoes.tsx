import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAtaStore } from "@/hooks/useAtaStore";
import { BackupRestore } from "@/components/BackupRestore";
import { 
  Settings, 
  Shield, 
  Building2, 
  PenTool, 
  Users, 
  UserCircle,
  Key,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Save,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function ConfiguracoesPage({ store }: Props) {
  const { profile, isAdmin, isMaster } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Estatuto state
  const [estatutoTexto, setEstatutoTexto] = useState(store.churchInfo?.estatuto_texto || "");
  const [regimentoTexto, setRegimentoTexto] = useState(store.churchInfo?.regimento_texto || "");
  const [savingEstatuto, setSavingEstatuto] = useState(false);

  useEffect(() => {
    const loadGlobalText = async () => {
      if (store.churchInfo) {
        setEstatutoTexto(store.churchInfo.estatuto_texto || "");
        setRegimentoTexto(store.churchInfo.regimento_texto || "");
      } else if (isAdmin || isMaster) {
        // Se estiver no modo "Todas as Unidades", busca de qualquer igreja para preencher o campo
        const { data } = await supabase
          .from('churches')
          .select('estatuto_texto, regimento_texto')
          .not('estatuto_texto', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setEstatutoTexto(data.estatuto_texto || "");
          setRegimentoTexto(data.regimento_texto || "");
        }
      }
    };
    loadGlobalText();
  }, [store.churchInfo, isAdmin, isMaster]);

  useEffect(() => {
    if (isAdmin || isMaster || profile?.id) {
      console.log("Fetching users as:", isMaster ? "Master" : (isAdmin ? "Admin" : "User (Forced)"));
      fetchUsers();
    }
  }, [isAdmin, isMaster, profile?.id]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let query = supabase.from("profiles").select("*");
      
      if (isAdmin && !isMaster) {
        query = query.eq("church_id", profile?.church_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setLoading(true);
    try {
      // Definimos o flag de troca obrigatória
      const { error } = await supabase
        .from("profiles")
        .update({ 
          force_password_change: true 
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Usuário marcado para troca de senha obrigatória no próximo login.");
      setIsResetDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao resetar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOwnPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Limpar flag de troca obrigatória do próprio perfil se existir
      await supabase
        .from("profiles")
        .update({ force_password_change: false })
        .eq("id", profile?.id);

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erro ao alterar senha: " + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // As salvaguardas já acontecem via store.saveDefault conforme o usuário digita ou via botão
    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações salvas com sucesso!");
    }, 500);
  };

  const handleExport = () => ({
    membros: store.membros,
    historico: store.historico,
    defaults: store.defaults,
  });

  const handleImport = (data: { membros?: any[]; historico?: any[]; defaults?: Record<string, string> }) => {
    if (data.membros) localStorage.setItem('membrosAvivaAta', JSON.stringify(data.membros));
    if (data.historico) localStorage.setItem('atasAvivaHistorico2025', JSON.stringify(data.historico));
    if (data.defaults) localStorage.setItem('ataDefaults', JSON.stringify(data.defaults));
    window.location.reload();
  };

  const handleSaveEstatuto = async () => {
    setSavingEstatuto(true);
    try {
      console.log("Salvando Base Legal Global...");
      
      // Atualiza TODAS as igrejas de uma vez, já que o estatuto é único
      const { data, error } = await supabase
        .from('churches')
        .update({ 
          estatuto_texto: estatutoTexto,
          regimento_texto: regimentoTexto
        })
        .not('id', 'is', null) // Isso garante que o update pegue todas as linhas
        .select();
      
      if (error) throw error;
      toast.success("Base Legal salva e sincronizada para todas as unidades!");
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setSavingEstatuto(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> Painel de Configurações
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Personalize a identidade e a automação do seu sistema</p>
      </div>

      <Tabs defaultValue="identidade" className="w-full">
        <TabsList className={`grid w-full h-auto p-1 bg-muted/50 rounded-xl overflow-x-auto ${
          (isAdmin || isMaster) ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-3'
        }`}>
          <TabsTrigger value="identidade" className="py-3 gap-2">
            <Building2 className="w-4 h-4" /> 
            <span className="hidden sm:inline">Identidade</span>
          </TabsTrigger>
          <TabsTrigger value="automacao" className="py-3 gap-2">
            <PenTool className="w-4 h-4" /> 
            <span className="hidden sm:inline">Automação</span>
          </TabsTrigger>
          <TabsTrigger value="minha-conta" className="py-3 gap-2">
            <UserCircle className="w-4 h-4" /> 
            <span className="hidden sm:inline">Minha Conta</span>
          </TabsTrigger>
          {(isAdmin || isMaster) && (
            <>
              <TabsTrigger value="usuarios" className="py-3 gap-2">
                <Users className="w-4 h-4" /> 
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="estatuto" className="py-3 gap-2">
                <Scale className="w-4 h-4" /> 
                <span className="hidden sm:inline">Base Legal</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="py-3 gap-2">
                <Shield className="w-4 h-4" /> 
                <span className="hidden sm:inline">Backup</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="identidade" className="mt-6">
          <div className="section-card space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Identidade Institucional</h3>
            </div>
            
            <form onSubmit={handleSaveDefaults} className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ da Igreja</Label>
                <Input 
                  id="cnpj" 
                  placeholder="00.000.000/0000-00" 
                  value={store.defaults.cnpj || ''} 
                  onChange={(e) => store.saveDefault('cnpj', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade / UF</Label>
                <Input 
                  id="cidade" 
                  value={store.churchInfo?.cidade ? `${store.churchInfo.cidade} / ${store.churchInfo.estado}` : ''} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-[10px] text-muted-foreground italic">Vinculado à unidade selecionada no menu lateral.</p>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input 
                  id="endereco" 
                  placeholder="Ex: Rua das Oliveiras, 123, Centro" 
                  value={store.defaults.localReuniao || ''} 
                  onChange={(e) => store.saveDefault('localReuniao', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Identidade"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="automacao" className="mt-6">
          <div className="section-card space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <PenTool className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Automação de Atas</h3>
            </div>
            
            <form onSubmit={handleSaveDefaults} className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="def-dirigente">Pastor Dirigente Padrão</Label>
                <Input 
                  id="def-dirigente" 
                  placeholder="Nome do pastor titular" 
                  value={store.defaults.pastorDirigente || ''} 
                  onChange={(e) => store.saveDefault('pastorDirigente', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="def-secretario">Secretário(a) Titular</Label>
                <Input 
                  id="def-secretario" 
                  placeholder="Nome do secretário(a)" 
                  value={store.defaults.nomeSecretario || ''} 
                  onChange={(e) => store.saveDefault('nomeSecretario', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="def-tesoureiro">Tesoureiro(a) Padrão</Label>
                <Input 
                  id="def-tesoureiro" 
                  placeholder="Nome do responsável pelo financeiro" 
                  value={store.defaults.tesoureira || ''} 
                  onChange={(e) => store.saveDefault('tesoureira', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  Salvar Padrões de Preenchimento
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {(isAdmin || isMaster) && (
          <TabsContent value="estatuto" className="mt-6">
            <div className="section-card space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Base Legal da Igreja (Global)</h3>
                </div>
                <Button onClick={handleSaveEstatuto} disabled={savingEstatuto} className="gap-2">
                  {savingEstatuto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Base Legal
                </Button>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">
                  <strong>Atenção:</strong> O Estatuto e o Regimento são únicos. Ao salvar aqui, as informações serão atualizadas para <strong>todas as unidades</strong> do sistema automaticamente.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-base font-bold text-indigo-900">Estatuto Social</Label>
                  <textarea
                    value={estatutoTexto}
                    onChange={(e) => setEstatutoTexto(e.target.value)}
                    className="w-full min-h-[400px] p-4 rounded-xl border border-input bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cole aqui o Estatuto Social..."
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-bold text-violet-900">Regimento Interno</Label>
                  <textarea
                    value={regimentoTexto}
                    onChange={(e) => setRegimentoTexto(e.target.value)}
                    className="w-full min-h-[400px] p-4 rounded-xl border border-input bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Cole aqui o Regimento Interno..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        )}



        <TabsContent value="minha-conta" className="mt-6">
          <div className="section-card space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Segurança da Minha Conta</h3>
            </div>
            
            <form onSubmit={handleOwnPasswordChange} className="max-w-md space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Status da Conta
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background">ID: {profile?.id.substring(0, 8)}...</Badge>
                  {isAdmin && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Admin</Badge>}
                  {isMaster && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Master</Badge>}
                  {!isAdmin && !isMaster && <Badge variant="secondary">Usuário Comum</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Igreja vinculada: <span className="font-mono">{profile?.church_id || 'Nenhuma'}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pw">Nova Senha</Label>
                <Input 
                  id="new-pw" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirmar Nova Senha</Label>
                <Input 
                  id="confirm-pw" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              <Button type="submit" disabled={isChangingPassword} className="gap-2">
                {isChangingPassword ? "Alterando..." : <><ShieldCheck className="w-4 h-4" /> Atualizar Senha</>}
              </Button>
            </form>
          </div>
        </TabsContent>

        {(isAdmin || isMaster) && (
          <TabsContent value="usuarios" className="mt-6">
            <div className="section-card space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Gestão de Usuários</h3>
                </div>
                {isMaster && <Badge variant="outline" className="bg-primary/5">Visão Master (Todas as Igrejas)</Badge>}
              </div>

              {loadingUsers ? (
                <div className="py-10 text-center animate-pulse text-muted-foreground">Carregando lista de usuários...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="font-bold text-foreground">{u.nome || u.full_name || "Usuário sem nome"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {u.role === 'master' ? 'Master' : u.role === 'admin' ? 'Admin' : 'Membro'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.force_password_change ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" /> Reset Pendente
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Ativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {u.id !== profile?.id && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:bg-destructive/5 border-destructive/20 gap-2 font-bold"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsResetDialogOpen(true);
                                  }}
                                >
                                  <Key className="w-4 h-4" /> Forçar Troca de Senha
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Confirmar Reset de Senha
              </DialogTitle>
              <DialogDescription>
                Você está prestes a resetar a senha de <strong>{selectedUser?.full_name}</strong>. 
                O usuário será obrigado a criar uma nova senha no próximo login.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleResetPassword(selectedUser?.id)}>Confirmar Reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {(isAdmin || isMaster) && (
          <TabsContent value="backup" className="mt-6">
            <div className="space-y-6">
              <BackupRestore onExport={handleExport} onImport={handleImport} />
              
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex gap-4">
                <Shield className="w-5 h-5 text-orange-600 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-sm text-orange-800">Cuidado com seus dados</h4>
                  <p className="text-xs text-orange-700 leading-relaxed mt-1">
                    O backup exporta membros, histórico e suas configurações de automação. Mantenha este arquivo em local seguro.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
