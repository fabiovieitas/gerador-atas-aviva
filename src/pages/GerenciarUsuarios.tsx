import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAtaStore } from '@/hooks/useAtaStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Users, Copy, Clock, CheckCircle, XCircle, Church, Trash2, Edit2, Save, X, RefreshCcw, Key, ShieldAlert, Mail, Beaker } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChurchRow {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

interface Invite {
  id: string;
  email: string;
  nome: string;
  role: string;
  used: boolean;
  token: string;
  created_at: string;
  expires_at: string;
  church_id: string | null;
  invited_by: string;
  profiles?: { nome: string }; // Nome de quem convidou
}

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  church_id: string | null;
  created_at: string;
  roles: string[];
  login_count?: number;
  last_login?: string;
  force_password_change?: boolean;
}

interface AuditLogRecord {
  id: string;
  user_id: string;
  church_id: string;
  action: string;
  details: string;
  created_at: string;
  profiles?: { nome: string };
  churches?: { nome: string };
}

interface UserSessionRecord {
  id: string;
  user_id: string;
  started_at: string;
  last_activity_at: string;
}

/* ─── Helpers Globais para evitar White Screen ─── */
const getRoleLabel = (r: string, isMaster: boolean) => {
  if (r === 'master') return 'Admin'; // Nunca exibe Master publicamente
  if (r === 'admin') return 'Admin';
  return 'Secretário';
};

const getRoleBadgeVariant = (r: string) => {
  if (r === 'master') return 'default' as const; // Troca de vermelho destrutivo para azul admin
  if (r === 'admin') return 'default' as const;
  return 'secondary' as const;
};

const getRoleOptions = (isMaster: boolean) => {
  const options = [
    { value: 'user', label: 'Secretário' },
    { value: 'admin', label: 'Admin' },
  ];
  if (isMaster) {
    options.push({ value: 'master', label: 'Admin (Master)' }); // Master vê que é Master, outros não
  }
  return options;
};

const getTimeRemaining = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - new Date().getTime();
  if (diff <= 0) return { label: 'Expirado', color: 'text-destructive bg-destructive/10 border-destructive/20' };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return { label: `Expira em ${days}d`, color: 'text-green-600 bg-green-50 border-green-200' };
  return { label: `Expira em ${hours}h`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
};

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function GerenciarUsuariosPage({ store }: Props) {
  const { isMaster, isAdmin, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isMaster) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
          <Users className="w-7 h-7" /> Gerenciar Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, convites e igrejas</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full h-auto bg-muted/50 p-1 gap-1">
          <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
          <TabsTrigger value="invites" className="text-xs sm:text-sm">Convites</TabsTrigger>
          <TabsTrigger value="churches" className="text-xs sm:text-sm">Igrejas</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">Atividade</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="focus-visible:outline-none">
          <UsersTab store={store} />
        </TabsContent>
        <TabsContent value="invites" className="focus-visible:outline-none">
          <InvitesTab store={store} />
        </TabsContent>
        <TabsContent value="churches" className="focus-visible:outline-none">
          <ChurchesTab />
        </TabsContent>
        <TabsContent value="activity" className="focus-visible:outline-none">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="audit" className="focus-visible:outline-none">
          <AuditTab />
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex gap-4">
          <div className="p-2 bg-rose-100 rounded-full text-rose-600 shrink-0 h-fit">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-800">Convites Seguros</h4>
            <p className="text-xs text-rose-700 leading-relaxed mt-1">
              Sempre utilize a aba <strong>"Convites"</strong> para trazer novos secretários. Isso vincula o novo usuário à igreja correta desde o início e garante que o cadastro seja feito apenas por pessoas autorizadas.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-4">
          <div className="p-2 bg-slate-200 rounded-full text-slate-600 shrink-0 h-fit">
            <RefreshCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">Transparência e Auditoria</h4>
            <p className="text-xs text-slate-700 leading-relaxed mt-1">
              As abas de <strong>"Atividade"</strong> e <strong>"Auditoria"</strong> servem para proteger você e a igreja. Elas registram quem fez o quê e quando, evitando mal-entendidos sobre alterações em atas ou membros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── Users Tab ─── */
function UsersTab({ store }: { store: ReturnType<typeof useAtaStore> }) {
  const { user, isMaster } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editChurch, setEditChurch] = useState('');
  const [editRole, setEditRole] = useState('');
  const [filterChurch, setFilterChurch] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Forçamos sempre para 'all' ao carregar esta aba específica
    setFilterChurch('all');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, churchesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('nome'),
        supabase.from('user_roles').select('*'),
        supabase.from('churches').select('id, nome, cidade, estado').order('nome'),
      ]);

      if (churchesRes.data) setChurches(churchesRes.data);

      if (profilesRes.data && rolesRes.data) {
        const mapped: UserProfile[] = profilesRes.data.map(p => ({
          ...p,
          roles: rolesRes.data
            .filter(r => r.user_id === p.user_id)
            .map(r => r.role),
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (u: UserProfile) => {
    setEditingId(u.user_id);
    setEditChurch(u.church_id || 'none');
    setEditRole(u.roles[0] || 'user');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (u: UserProfile) => {
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ church_id: editChurch === 'none' ? null : editChurch })
        .eq('user_id', u.user_id);

      if (profErr) throw profErr;

      if (isMaster && editRole !== u.roles[0]) {
        await supabase.from('user_roles').delete().eq('user_id', u.user_id);
        await supabase.from('user_roles').insert({ user_id: u.user_id, role: editRole as any });
      }

      toast.success('Usuário atualizado!');
      setEditingId(null);
      loadData();
    } catch (err) {
      toast.error('Erro ao salvar alterações');
    }
  };

  const deleteUser = async (u: UserProfile) => {
    if (u.user_id === user?.id) {
      toast.error('Você não pode excluir seu próprio acesso.');
      return;
    }
    
    const uIsMaster = u.roles?.includes('master');
    if (uIsMaster && !isMaster) {
      toast.error('Apenas um Master pode remover outro Master.');
      return;
    }

    if (!confirm(`Deseja remover TOTALMENTE o acesso de ${u.nome}?`)) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', u.user_id);
      await supabase.from('profiles').delete().eq('user_id', u.user_id);
      toast.success('Acesso removido');
      loadData();
    } catch (err) {
      toast.error('Erro ao remover usuário');
    }
  };

  const handleResetPassword = async (u: UserProfile) => {
    if (!confirm(`Deseja resetar a senha de ${u.nome}? \n\nA senha voltará para o padrão: Aviva@123 \n\nEle será obrigado a trocar essa senha no primeiro login.`)) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ force_password_change: true })
        .eq("user_id", u.user_id);

      if (error) throw error;
      toast.success(`Senha de ${u.nome} resetada para: Aviva@123`, {
        duration: 5000,
        description: "Informe a senha padrão ao usuário. Ele terá que trocá-la ao entrar."
      });
      loadData();
    } catch (error: any) {
      toast.error("Erro ao resetar: " + error.message);
    }
  };

  const getChurchName = (churchId: string | null) => {
    if (!churchId || churchId === 'none') return '—';
    const c = churches?.find(ch => ch.id === churchId);
    return c ? `${c.nome}${c.cidade ? ` - ${c.cidade}` : ''}` : '—';
  };

  const filtered = filterChurch === 'all'
    ? users
    : filterChurch === 'none'
      ? users.filter(u => !u.church_id)
      : users.filter(u => u.church_id === filterChurch);

  const visible = isMaster ? filtered : filtered.filter(u => !u.roles?.includes('master'));
  const roleOptions = getRoleOptions(isMaster);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Filtrar por igreja:</Label>
        <Select value={filterChurch} onValueChange={setFilterChurch}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="none">Sem igreja</SelectItem>
            {churches?.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3 text-sm text-primary">
        <Key className="w-4 h-4" />
        <span><strong>Dica:</strong> A senha padrão para usuários resetados é <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">Aviva@123</code></span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">Carregando usuários...</div>
      ) : visible?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-3">
          {visible?.map(u => {
            const sessionProcessed = sessionStorage.getItem(`auth_processed_${u.user_id}`);
            if (!sessionProcessed) {
              sessionStorage.setItem(`auth_processed_${u.user_id}`, 'true');
            }
            const isEditing = editingId === u.user_id;
            return (
              <div key={u.user_id} className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.nome}</span>
                      {u.roles?.map(r => (
                        <Badge key={r} variant={getRoleBadgeVariant(r)}>{getRoleLabel(r, isMaster)}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {!isEditing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Igreja: {getChurchName(u.church_id)}
                      </p>
                    )}
                  </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          {u.force_password_change && (
                            <Badge variant="destructive" className="text-[10px] h-5 py-0 px-1.5 animate-pulse">
                              Reset Pendente
                            </Badge>
                          )}
                          {u.user_id !== user?.id && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleResetPassword(u)} 
                              className="gap-1 border-primary/20 text-primary hover:bg-primary/5"
                              title="Forçar troca de senha"
                            >
                              <Key className="w-3 h-3" /> Resetar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => startEdit(u)} className="gap-1">
                            <Edit2 className="w-3 h-3" /> Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => deleteUser(u)} 
                            disabled={u.user_id === user?.id}
                            className="text-destructive hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                </div>

                {isEditing && (
                  <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs">Igreja</Label>
                      <Select value={editChurch} onValueChange={setEditChurch}>
                        <SelectTrigger className="w-52"><SelectValue placeholder="Sem igreja" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem igreja</SelectItem>
                          {churches?.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isMaster && (
                      <div className="space-y-1">
                        <Label className="text-xs">Papel</Label>
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roleOptions?.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(u)} className="gap-1">
                        <Save className="w-3 h-3" /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
                        <X className="w-3 h-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Invites Tab ─── */
function InvitesTab({ store }: { store: ReturnType<typeof useAtaStore> }) {
  const { isMaster, user } = useAuth();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState('user');
  const [churchId, setChurchId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    if (store.selectedChurchId && store.selectedChurchId !== 'all') {
      setChurchId(store.selectedChurchId);
    }
  }, [store.selectedChurchId]);

  const loadData = async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        supabase.from('churches').select('id, nome, cidade, estado').order('nome'),
        supabase.from('invites').select('*, profiles:invited_by(nome)').order('created_at', { ascending: false }),
      ]);
      if (cRes.data) setChurches(cRes.data);
      if (iRes.data) setInvites(iRes.data as any);
    } catch (err) {
      console.error(err);
      setInvites([]);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome || !user?.id) return;
    setLoading(true);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const { error } = await supabase.from('invites').insert({
      email, nome,
      church_id: churchId === 'none' || !churchId ? null : churchId,
      role: role as any,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id,
      token: Math.random().toString(36).substring(2) + Date.now().toString(36),
    });

    if (error) {
      toast.error('Erro ao criar convite');
    } else {
      toast.success('Convite criado!');
      setEmail(''); setNome(''); setChurchId('');
      loadData();
    }
    setLoading(false);
  };

  const deleteInvite = async (id: string) => {
    if (!confirm('Excluir este convite?')) return;
    await supabase.from('invites').delete().eq('id', id);
    toast.success('Convite excluído');
    loadData();
  };

  const resendInvite = async (id: string) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await supabase.from('invites').update({ expires_at: expiresAt.toISOString() }).eq('id', id);
    toast.success('Convite renovado por 7 dias');
    loadData();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/cadastro?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const generateTestUser = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    const id = Math.floor(Math.random() * 10000);
    const nomeTeste = `Usuário Teste ${id}`;
    const emailTeste = `teste.${id}@aviva.com`;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const { error } = await supabase.from('invites').insert({
      nome: nomeTeste, 
      email: emailTeste,
      role: 'user',
      church_id: store.selectedChurchId === 'all' ? null : store.selectedChurchId,
      token: Math.random().toString(36).substring(2) + Date.now().toString(36),
      expires_at: expiresAt.toISOString(),
      invited_by: user.id
    });

    if (error) {
      toast.error(`Erro ao gerar teste: ${error.message}`);
    } else {
      toast.success('Convite de teste gerado com sucesso!');
      loadData();
    }
    setLoading(false);
  };

  const roleOptions = getRoleOptions(isMaster);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 section-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Novo Convite
          </h2>
          <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="form-label">Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <Label className="form-label">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="form-label">Papel</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="form-label">Igreja</Label>
              <Select value={churchId} onValueChange={setChurchId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem igreja</SelectItem>
                  {churches?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Criando...' : 'Criar Convite'}
              </Button>
            </div>
          </form>
        </div>

        <div className="section-card bg-primary/5 border-primary/20 flex flex-col justify-center text-center p-6">
          <Beaker className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-sm mb-2">Modo de Teste</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Gere um convite rápido para validar o sistema em janela anônima.
          </p>
          <Button size="sm" variant="outline" onClick={generateTestUser} disabled={loading} className="w-full">
            Gerar Convite de Teste
          </Button>
        </div>
      </div>

      <div className="section-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Convites Enviados
        </h2>
        <div className="space-y-3">
          {invites?.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{inv.nome}</span>
                  <Badge variant={getRoleBadgeVariant(inv.role)}>{getRoleLabel(inv.role, isMaster)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{inv.email}</p>
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Convidado por: <span className="font-medium text-foreground">{inv.profiles?.nome === 'Fábio' ? 'Admin Fábio' : (inv.profiles?.nome || 'Sistema')}</span>
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getTimeRemaining(inv.expires_at).color}`}>
                    {getTimeRemaining(inv.expires_at).label}
                  </span>
                  {inv.used && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                      Utilizado
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!inv.used && (
                  <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>Copiar Link</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => resendInvite(inv.id)} className="text-blue-600"><RefreshCcw className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteInvite(inv.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Churches Tab ─── */
function ChurchesTab() {
  const { isMaster, isAdmin } = useAuth();
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('RJ');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadChurches(); }, []);

  const loadChurches = async () => {
    const { data } = await supabase.from('churches').select('id, nome, cidade, estado').order('nome');
    if (data) setChurches(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    setLoading(true);
    const { error } = await supabase.from('churches').insert({ nome, cidade: cidade || null, estado: estado || null });
    if (error) {
      toast.error('Erro ao adicionar igreja: ' + error.message);
    } else {
      toast.success('Igreja adicionada!');
      setNome(''); setCidade(''); loadChurches();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!nome) return;
    setLoading(true);
    const { error } = await supabase.from('churches').update({ 
      nome, 
      cidade: cidade || null, 
      estado: estado || null 
    }).eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar igreja: ' + error.message);
    } else {
      toast.success('Igreja atualizada!');
      setEditingId(null);
      setNome(''); setCidade(''); setEstado('RJ');
      loadChurches();
    }
    setLoading(false);
  };

  const startEdit = (church: ChurchRow) => {
    setEditingId(church.id);
    setNome(church.nome);
    setCidade(church.cidade || '');
    setEstado(church.estado || 'RJ');
  };

  const deleteChurch = async (id: string) => {
    if (!confirm('Deseja realmente remover esta igreja? Isso só funcionará se não houver membros ou atas vinculadas.')) return;
    try {
      const { error } = await supabase.from('churches').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          throw new Error('Não é possível apagar: esta igreja possui membros ou atas vinculadas a ela.');
        }
        throw error;
      }
      toast.success('Igreja removida com sucesso');
      loadChurches();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      {isMaster && (
        <div className="section-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Church className="w-5 h-5" /> Nova Igreja
          </h2>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-3">
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" required />
            <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
            <Button type="submit" disabled={loading}>Adicionar</Button>
          </form>
        </div>
      )}

      <div className="section-card">
        <h2 className="text-lg font-semibold mb-4">Igrejas Cadastradas</h2>
        <div className="space-y-3">
          {churches?.map(c => (
            <div key={c.id} className="p-4 border rounded-xl bg-card/50 hover:bg-card transition-colors">
              {editingId === c.id ? (
                <div className="grid gap-3 sm:grid-cols-4 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Igreja</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} size={32} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cidade</Label>
                    <Input value={cidade} onChange={e => setCidade(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(c.id)} disabled={loading} className="flex-1">
                      <Save className="w-4 h-4 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Church className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{c.nome}</h3>
                      <p className="text-xs text-muted-foreground">{c.cidade} / {c.estado}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMaster && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)} className="text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {(isMaster || isAdmin) && (
                      <Button size="sm" variant="ghost" onClick={() => deleteChurch(c.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ─── Activity Tab ─── */
function ActivityTab() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadActivity(); }, []);

  const loadActivity = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      supabase.from('profiles').select('*').order('last_login', { ascending: false }),
      supabase.from('user_sessions').select('*')
    ]);
    if (pRes.data) setProfiles(pRes.data as any);
    if (sRes.data) setSessions(sRes.data as any);
    setLoading(false);
  };

  const calculateDuration = (userId: string) => {
    const userSessions = sessions.filter(s => s.user_id === userId);
    let totalMinutes = 0;
    userSessions.forEach(s => {
      const start = new Date(s.started_at).getTime();
      const last = new Date(s.last_activity_at).getTime();
      const diff = Math.max(0, (last - start) / 60000); // em minutos
      totalMinutes += diff;
    });
    return Math.round(totalMinutes);
  };

  return (
    <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" /> Monitoramento de Acessos
        </h2>
        <Button size="sm" variant="outline" onClick={loadActivity} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Usuário</th>
                <th className="text-center p-4 font-semibold">Logins</th>
                <th className="text-center p-4 font-semibold">Último Acesso</th>
                <th className="text-center p-4 font-semibold">Tempo Online</th>
                <th className="text-right p-4 font-semibold">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profiles.map(p => {
                const totalMin = calculateDuration(p.user_id);
                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{p.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className="font-mono bg-background">
                        {p.login_count || 0}
                      </Badge>
                    </td>
                    <td className="p-4 text-center text-xs">
                      {p.last_login ? new Date(p.last_login).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="secondary" className="font-mono px-3 py-1 bg-primary/5 text-primary border-primary/10">
                        {totalMin > 60 
                          ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` 
                          : `${totalMin} min`}
                      </Badge>
                    </td>
                    <td className="p-4 text-right text-xs text-muted-foreground font-mono">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3">
        <div className="text-blue-500 shrink-0">ℹ️</div>
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Como funciona:</strong> O tempo online é calculado através de um "pulso" enviado pelo navegador a cada minuto. Se o usuário fechar a aba ou ficar offline, o contador para automaticamente.
        </p>
      </div>
    </div>
  );
}

/* ─── Audit Tab ─── */
function AuditTab() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAuditLogs(); }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*, profiles(nome), churches(nome)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setLogs(data as any);
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'SALVOU_ATA': 'bg-blue-100 text-blue-700 border-blue-200',
      'REMOVEU_ATA': 'bg-red-100 text-red-700 border-red-200',
      'CRIOU_MEMBRO': 'bg-green-100 text-green-700 border-green-200',
      'REMOVEU_MEMBRO': 'bg-orange-100 text-orange-700 border-orange-200',
      'EDITOU_MEMBRO': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[action] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" /> Histórico de Ações (Auditoria)
        </h2>
        <Button size="sm" variant="outline" onClick={loadAuditLogs} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Data/Hora</th>
                <th className="text-left p-4 font-semibold">Usuário</th>
                <th className="text-left p-4 font-semibold">Ação</th>
                <th className="text-left p-4 font-semibold">Detalhes</th>
                <th className="text-left p-4 font-semibold">Igreja</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-medium">
                    {log.profiles?.nome || 'Sistema'}
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0.5 border ${getActionBadge(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {log.details}
                  </td>
                  <td className="p-4 text-xs font-medium text-primary whitespace-nowrap">
                    {log.churches?.nome || '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 flex gap-3">
        <div className="text-orange-500 shrink-0">🛡️</div>
        <p className="text-xs text-orange-700 leading-relaxed">
          <strong>Segurança:</strong> Este log é imutável e registra todas as ações críticas realizadas no sistema para garantir a integridade dos dados da Igreja AVIVA.
        </p>
      </div>
    </div>
  );
}



