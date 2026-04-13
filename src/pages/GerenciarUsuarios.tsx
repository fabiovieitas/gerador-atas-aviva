import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Users, Copy, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Church {
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

export function GerenciarUsuariosPage() {
  const { isMaster, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState('user');
  const [churchId, setChurchId] = useState('');
  const [churches, setChurches] = useState<Church[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChurches();
    loadInvites();
  }, []);

  const loadChurches = async () => {
    const { data } = await supabase.from('churches').select('*').order('nome');
    if (data) setChurches(data);
  };

  const loadInvites = async () => {
    const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
    if (data) setInvites(data);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) {
      toast.error('Preencha email e nome.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, nome, church_id: churchId || null, role },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar convite.');
    } else {
      toast.success('Convite criado com sucesso!');
      setEmail('');
      setNome('');
      setRole('user');
      setChurchId('');
      loadInvites();
    }
    setLoading(false);
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

  if (!isAdmin && !isMaster) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
          <Users className="w-7 h-7" /> Gerenciar Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Convide novos usuários para o sistema</p>
      </div>

      {/* Invite Form */}
      <div className="section-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Novo Convite
        </h2>
        <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="gap-2">
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
                    ) : expired ? (
                      <Badge variant="outline" className="gap-1 text-destructive">
                        <XCircle className="w-3 h-3" /> Expirado
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)} className="gap-1">
                        <Copy className="w-3 h-3" /> Copiar Link
                      </Button>
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
