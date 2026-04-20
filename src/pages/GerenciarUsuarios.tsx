import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Users, Copy, Clock, CheckCircle, XCircle, Church, Trash2, Edit2, Save, X } from 'lucide-react';
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
}

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  church_id: string | null;
  created_at: string;
  roles: string[];
}

export function GerenciarUsuariosPage() {
  const { isMaster, isAdmin, user } = useAuth();

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="churches">Igrejas</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="invites"><InvitesTab /></TabsContent>
        <TabsContent value="churches"><ChurchesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab() {
  const { isMaster, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editChurch, setEditChurch] = useState('');
  const [editRole, setEditRole] = useState('');
  const [filterChurch, setFilterChurch] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [profilesRes, rolesRes, churchesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('nome'),
      supabase.from('user_roles').select('*'),
      supabase.from('churches').select('*').order('nome'),
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
  };

  const startEdit = (u: UserProfile) => {
    setEditingId(u.user_id);
    setEditChurch(u.church_id || '');
    setEditRole(u.roles[0] || 'user');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (u: UserProfile) => {
    // Update church
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ church_id: editChurch || null })
      .eq('user_id', u.user_id);

    if (profErr) {
      toast.error('Erro ao atualizar igreja.');
      return;
    }

    // Update role (only master can change roles)
    if (isMaster && editRole !== u.roles[0]) {
      // Delete old roles
      await supabase.from('user_roles').delete().eq('user_id', u.user_id);
      // Insert new role
      await supabase.from('user_roles').insert({ user_id: u.user_id, role: editRole as any });
    }

    toast.success('Usuário atualizado!');
    setEditingId(null);
    loadData();
  };

  const deleteUser = async (u: UserProfile) => {
    if (!confirm(`Tem certeza que deseja remover o acesso de ${u.nome}? Isso removerá o perfil e os papéis, mas a conta de autenticação precisará ser removida manualmente no painel do Supabase por segurança.`)) return;
    
    setEditingId('loading'); // Bloqueia UI
    
    try {
      // 1. Remover papéis
      await supabase.from('user_roles').delete().eq('user_id', u.user_id);
      
      // 2. Remover perfil
      await supabase.from('profiles').delete().eq('user_id', u.user_id);
      
      // 3. Remover convite vinculado (se existir) para invalidar o token
      if (u.email) {
        await supabase.from('invites').delete().eq('email', u.email);
      }
      
      toast.success('Usuário removido do sistema!');
      loadData();
    } catch (err) {
      toast.error('Erro ao remover usuário.');
    } finally {
      setEditingId(null);
    }
  };

  const getChurchName = (churchId: string | null) => {
    if (!churchId) return '—';
    const c = churches.find(ch => ch.id === churchId);
    return c ? `${c.nome}${c.cidade ? ` - ${c.cidade}` : ''}` : '—';
  };

  const getRoleLabel = (r: string) => {
    if (r === 'master') return isMaster ? 'Master' : 'Administrador';
    if (r === 'admin') return 'Administrador';
    return 'Usuário';
  };

  const getRoleBadgeVariant = (r: string) => {
    if (r === 'master') return 'destructive' as const;
    if (r === 'admin') return 'default' as const;
    return 'secondary' as const;
  };

  const roleOptions = isMaster
    ? [
        { value: 'user', label: 'Usuário' },
        { value: 'admin', label: 'Administrador' },
        { value: 'master', label: 'Master' },
      ]
    : [
        { value: 'user', label: 'Usuário' },
        { value: 'admin', label: 'Administrador' },
      ];

  const filtered = filterChurch === 'all'
    ? users
    : filterChurch === 'none'
      ? users.filter(u => !u.church_id)
      : users.filter(u => u.church_id === filterChurch);

  // Hide master users from admins
  const visible = isMaster ? filtered : filtered.filter(u => !u.roles.includes('master'));

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Filtrar por igreja:</Label>
        <Select value={filterChurch} onValueChange={setFilterChurch}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="none">Sem igreja</SelectItem>
            {churches.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-3">
          {visible.map(u => {
            const isEditing = editingId === u.user_id;
            return (
              <div key={u.user_id} className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.nome}</span>
                      {u.roles.map(r => (
                        <Badge key={r} variant={getRoleBadgeVariant(r)}>{getRoleLabel(r)}</Badge>
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
                        <Button size="sm" variant="outline" onClick={() => startEdit(u)} className="gap-1">
                          <Edit2 className="w-3 h-3" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteUser(u)} className="text-destructive hover:text-destructive">
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
                          {churches.map(c => (
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
                            {roleOptions.map(opt => (
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
function InvitesTab() {
  const { isMaster } = useAuth();
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
  }, []);

  const loadData = async () => {
    const [cRes, iRes] = await Promise.all([
      supabase.from('churches').select('*').order('nome'),
      supabase.from('invites').select('*').order('created_at', { ascending: false }),
    ]);
    if (cRes.data) setChurches(cRes.data);
    if (iRes.data) setInvites(iRes.data);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) {
      toast.error('Preencha email e nome.');
      return;
    }
    setLoading(true);
    
    // Calcula data de expiração baseada nos dias escolhidos
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const { data, error } = await supabase.from('invites').insert({
      email,
      nome,
      church_id: churchId || null,
      role: role as any,
      expires_at: expiresAt.toISOString(),
      invited_by: (await supabase.auth.getUser()).data.user?.id,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    }).select().single();

    if (error) {
      toast.error(error.message || 'Erro ao criar convite.');
    } else {
      toast.success('Convite criado com sucesso!');
      setEmail('');
      setNome('');
      setRole('user');
      setChurchId('');
      setExpiresInDays('7');
      loadData();
    }
    setLoading(false);
  };

  const deleteInvite = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este convite?')) return;
    const { error } = await supabase.from('invites').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir convite.');
    } else {
      toast.success('Convite excluído.');
      loadData();
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/cadastro?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const roleOptions = isMaster
    ? [
        { value: 'user', label: 'Usuário' },
        { value: 'admin', label: 'Administrador' },
        { value: 'master', label: 'Master' },
      ]
    : [
        { value: 'user', label: 'Usuário' },
        { value: 'admin', label: 'Administrador' },
      ];

  const getRoleLabel = (r: string) => {
    if (r === 'master') return isMaster ? 'Master' : 'Administrador';
    if (r === 'admin') return 'Administrador';
    return 'Usuário';
  };

  const getRoleBadgeVariant = (r: string) => {
    if (r === 'master') return 'destructive' as const;
    if (r === 'admin') return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Invite Form */}
      <div className="section-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Novo Convite
        </h2>
        <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="form-label">Nome completo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do convidado" required />
          </div>
          <div>
            <Label className="form-label">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" required />
          </div>
          <div>
            <Label className="form-label">Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map(opt => (
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
                {churches.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `- ${c.cidade}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="form-label">Expiração (dias)</Label>
            <Select value={expiresInDays} onValueChange={setExpiresInDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <Button type="submit" disabled={loading} className="gap-2 w-full">
              <UserPlus className="w-4 h-4" />
              {loading ? 'Criando...' : 'Criar Convite'}
            </Button>
          </div>
        </form>
      </div>

      {/* Invites List */}
      <div className="section-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Convites Enviados
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite criado ainda.</p>
        ) : (
          <div className="space-y-3">
            {invites.map(inv => {
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{inv.nome}</span>
                      <Badge variant={getRoleBadgeVariant(inv.role)}>{getRoleLabel(inv.role)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.used ? (
                      <Badge variant="outline" className="gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" /> Utilizado
                      </Badge>
                    ) : (
                      <>
                        {expired ? (
                          <Badge variant="outline" className="gap-1 text-destructive">
                            <XCircle className="w-3 h-3" /> Expirado
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)} className="gap-1">
                            <Copy className="w-3 h-3" /> Copiar Link
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteInvite(inv.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Churches Tab ─── */
function ChurchesTab() {
  const { isMaster } = useAuth();
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('RJ');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async () => {
    const { data } = await supabase.from('churches').select('*').order('nome');
    if (data) setChurches(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    setLoading(true);
    const { error } = await supabase.from('churches').insert({ nome, cidade: cidade || null, estado: estado || null });
    if (error) {
      toast.error('Erro ao adicionar igreja.');
    } else {
      toast.success('Igreja adicionada!');
      setNome('');
      setCidade('');
      setEstado('RJ');
      loadChurches();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta igreja?')) return;
    const { error } = await supabase.from('churches').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover. Verifique se há usuários vinculados.');
    } else {
      toast.success('Igreja removida.');
      loadChurches();
    }
  };

  return (
    <div className="space-y-6 mt-4">
      {isMaster && (
        <div className="section-card">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Church className="w-5 h-5" /> Nova Igreja
          </h2>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="form-label">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Aviva Floresta" required />
            </div>
            <div>
              <Label className="form-label">Cidade</Label>
              <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Floresta" />
            </div>
            <div>
              <Label className="form-label">Estado</Label>
              <Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="Ex: RJ" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={loading} className="gap-2">
                <Church className="w-4 h-4" />
                {loading ? 'Adicionando...' : 'Adicionar Igreja'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="section-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Igrejas Cadastradas</h2>
        {churches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma igreja cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {churches.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <span className="font-medium text-sm">{c.nome}</span>
                  {c.cidade && <span className="text-xs text-muted-foreground ml-2">— {c.cidade}, {c.estado}</span>}
                </div>
                {isMaster && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
