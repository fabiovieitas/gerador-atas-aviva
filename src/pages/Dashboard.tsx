import { useAtaStore } from "@/hooks/useAtaStore";
import { 
  FileText, Users, Clock, Plus, Church, BarChart3, RefreshCcw, 
  Activity, MessageCircle, Send, Trash2, Rocket, CheckCircle2, 
  Bell, Pencil, Megaphone, Star, Mail, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

interface GlobalStats {
  atasCount: number;
  membrosCount: number;
  churchesCount: number;
  atasPorIgreja: { church_name: string, count: number }[];
}

// COMPONENTE: MENSAGENS PARA O USUÁRIO (CORRIGIDO: FONTE ESCURA FORÇADA)
function UserSupportMessages() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);

  const fetchMyTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user?.id).neq('status', 'apagado').order('created_at', { ascending: false });
    if (data) setTickets(data);
  };

  useEffect(() => {
    if (user) fetchMyTickets();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm("Deseja apagar este chamado?")) {
      await supabase.from('support_tickets').update({ status: 'apagado' }).eq('id', id);
      fetchMyTickets();
    }
  };

  if (tickets.length === 0) return null;

  return (
    <div className="section-card border-primary/20 bg-primary/5 mb-6">
      <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" /> Suas Mensagens
      </h3>
      <div className="space-y-4">
        {tickets.map(t => (
          <div key={t.id} className="p-4 rounded-xl bg-white border shadow-sm group">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{t.subject}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-[15px] font-bold text-slate-900 leading-snug mb-3">{t.message}</p>
            {t.reply && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 relative">
                <div className="absolute -top-2 left-3 px-2 bg-green-600 text-white text-[8px] font-bold rounded uppercase">Resposta do Suporte</div>
                <p className="text-sm text-slate-900 font-bold leading-relaxed">{t.reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// COMPONENTE: GESTÃO DE NOVIDADES (MASTER)
function NewsManager() {
  const [news, setNews] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    if (data) setNews(data);
  };

  useEffect(() => { fetchNews(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      version: formData.get('version'),
      author_credit: formData.get('author_credit'),
    };

    if (editing?.id) {
      await supabase.from('news').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('news').insert(payload);
    }
    
    toast.success("Novidade publicada!");
    setEditing(null);
    setIsDialogOpen(false);
    fetchNews();
  };

  return (
    <div className="section-card border-accent/20 bg-accent/5 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-accent-foreground uppercase tracking-widest flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> Novidades
        </h3>
        <Button size="sm" onClick={() => { setEditing({}); setIsDialogOpen(true); }} className="h-7 text-[10px] bg-accent text-accent-foreground">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-2">
        {news.map(n => (
          <div key={n.id} className="flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-sm group">
            <p className="text-[11px] font-bold truncate pr-2">{n.title}</p>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(n); setIsDialogOpen(true); }} className="p-1 hover:bg-muted rounded"><Pencil className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader><DialogTitle>Publicar Novidade</DialogTitle></DialogHeader>
            <Input name="version" placeholder="Versão" defaultValue={editing?.version} />
            <Input name="title" placeholder="Título" defaultValue={editing?.title} required />
            <Textarea name="description" placeholder="Descrição" defaultValue={editing?.description} required />
            <Input name="author_credit" placeholder="Crédito ao Usuário" defaultValue={editing?.author_credit} />
            <Button type="submit" className="w-full">Publicar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// COMPONENTE: LISTA DE TICKETS (MASTER)
function SupportTicketsList({ onNewStatus }: { onNewStatus: (hasNew: boolean) => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'ativos' | 'futuro'>('ativos');

  const fetchTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').neq('status', 'apagado').order('created_at', { ascending: false });
    if (data) {
      setTickets(data);
      onNewStatus(data.some(t => t.status === 'aberto'));
    }
  };

  useEffect(() => {
    fetchTickets();
    const intv = setInterval(fetchTickets, 30000);
    return () => clearInterval(intv);
  }, []);

  const handleAction = async (id: string, action: 'reply' | 'delete' | 'future' | 'resolve') => {
    let update: any = {};
    if (action === 'reply') {
      if (!replyText[id]) return;
      update = { reply: replyText[id], status: 'resolvido', replied_at: new Date().toISOString() };
    } else if (action === 'delete') update = { status: 'apagado' };
    else if (action === 'future') update = { status: 'futuro' };
    else if (action === 'resolve') update = { status: 'resolvido', replied_at: new Date().toISOString() };

    const { error } = await supabase.from('support_tickets').update(update).eq('id', id);
    if (!error) {
      toast.success(action === 'resolve' ? "Chamado Resolvido!" : "Ação concluída!");
      fetchTickets();
    }
  };

  const hasNew = tickets.some(t => t.status === 'aberto');
  const filtered = tickets.filter(t => tab === 'futuro' ? t.status === 'futuro' : t.status !== 'futuro');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTab('ativos')} className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${tab === 'ativos' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground'}`}>
          CENTRAL {hasNew && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-ping ml-1" />}
        </button>
        <button onClick={() => setTab('futuro')} className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${tab === 'futuro' ? 'bg-purple-600 text-white shadow-md' : 'text-muted-foreground'}`}>
          REPOSITÓRIO
        </button>
      </div>

      <div className="grid gap-4">
        {filtered.map(t => (
          <div key={t.id} className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${t.status === 'resolvido' ? 'border-success/20 opacity-70' : 'border-primary/20'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${t.status === 'resolvido' ? 'bg-success/10 text-success' : t.status === 'futuro' ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary'}`}>
                  {t.subject}
                </span>
                <span className="text-[11px] font-bold text-slate-900">{t.user_nome}</span>
              </div>
              <button onClick={() => handleAction(t.id, 'delete')} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            
            <p className="text-[14px] font-bold text-slate-900 mb-4 bg-muted/30 p-3 rounded-lg leading-relaxed border-l-4 border-primary/20">
              "{t.message}"
            </p>
            
            <div className="space-y-2">
              {t.reply && (
                <div className="mb-3 p-2 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-[12px] text-slate-900 font-bold italic leading-relaxed">{t.reply}</p>
                </div>
              )}
              
              <textarea 
                placeholder="Responder..."
                className="w-full text-xs p-3 rounded-xl border border-primary/10 bg-primary/5 focus:ring-2 focus:ring-primary/20 min-h-[70px] resize-none"
                value={replyText[t.id] || ""}
                onChange={e => setReplyText({...replyText, [t.id]: e.target.value})}
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground font-mono">{t.user_email}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] text-purple-600" onClick={() => handleAction(t.id, 'future')}>Futuro</Button>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] text-success border-success/20 hover:bg-success/5 gap-1.5" onClick={() => handleAction(t.id, 'resolve')}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
                  </Button>
                  <Button size="sm" className="h-8 text-xs shadow-lg shadow-primary/10" onClick={() => handleAction(t.id, 'reply')}>Responder</Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage({ store }: Props) {
  const navigate = useNavigate();
  const { profile, isAdmin, isMaster } = useAuth();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      let q = supabase.from('audit_logs').select('*, profiles(nome), churches(nome)').order('created_at', { ascending: false }).limit(10);
      if (!isMaster && profile?.church_id) q = q.eq('church_id', profile.church_id);
      else if (isMaster && store.selectedChurchId !== 'all') q = q.eq('church_id', store.selectedChurchId);
      const { data } = await q;
      if (data) setActivities(data);
    } catch (err) { console.error(err); }
    finally { setLoadingActivities(false); }
  };

  const fetchGlobalStats = async () => {
    const [atasRes, membrosRes, churchesRes] = await Promise.all([
      supabase.from('atas').select('id, church_id, churches(nome)', { count: 'exact' }),
      supabase.from('membros').select('id', { count: 'exact' }),
      supabase.from('churches').select('id', { count: 'exact' }),
    ]);

    if (atasRes.data) {
      const counts: Record<string, number> = {};
      atasRes.data.forEach((a: any) => {
        const name = a.churches?.nome || 'Sem Nome';
        counts[name] = (counts[name] || 0) + 1;
      });
      setGlobalStats({
        atasCount: atasRes.count || 0,
        membrosCount: membrosRes.count || 0,
        churchesCount: churchesRes.count || 0,
        atasPorIgreja: Object.entries(counts).map(([name, count]) => ({ church_name: name, count })),
      });
    }
  };

  useEffect(() => {
    fetchActivities();
    if (isAdmin || isMaster) fetchGlobalStats();
  }, [store.selectedChurchId, isAdmin, isMaster]);

  const stats = (isAdmin || isMaster) && globalStats ? [
    { label: "Atas Globais", value: globalStats.atasCount, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Total Membros", value: globalStats.membrosCount, icon: Users, color: "bg-success/10 text-success" },
    { label: "Unidades", value: globalStats.churchesCount, icon: Church, color: "bg-accent/10 text-accent-foreground" },
  ] : [
    { label: "Atas Geradas", value: store.historico.length, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Seus Membros", value: store.membros.length, icon: Users, color: "bg-success/10 text-success" },
    { label: "Última Ata", value: store.historico[0] ? new Date(store.historico[0].geradoEm).toLocaleDateString('pt-BR') : '—', icon: Clock, color: "bg-accent/10 text-accent-foreground" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {store.churchInfo?.nome || 'Igreja AVIVA'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Olá, <span className="font-semibold text-primary">{profile?.nome || 'Usuário'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMaster && (
             <div className="relative p-2 bg-red-50 rounded-full border border-red-100">
               <Bell className={`w-5 h-5 text-red-500 ${hasNewAlert ? 'animate-bounce' : ''}`} />
               {hasNewAlert && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />}
             </div>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchActivities(); fetchGlobalStats(); }} className="rounded-xl border-primary/20">
            <RefreshCcw className={`w-4 h-4 ${loadingActivities ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card group hover:scale-[1.02] transition-all">
            <div className={`stat-icon ${s.color}`}><s.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          {!isMaster && !isAdmin && <UserSupportMessages />}

          <div className="section-card min-h-[500px] border-primary/10 shadow-sm relative overflow-hidden">
            <h2 className="section-title flex items-center gap-2 mb-8">
              <div className="p-1.5 bg-primary/10 rounded-lg"><Activity className="w-4 h-4 text-primary" /></div>
              Atividade Recente
            </h2>
            
            {isMaster && (
              <div className="mb-12">
                <SupportTicketsList onNewStatus={setHasNewAlert} />
              </div>
            )}

            <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/50">
              {activities.map(log => (
                <div key={log.id} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary group-hover:bg-primary transition-all z-10" />
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900">{log.profiles?.nome || 'Sistema'}</span>
                        <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                          {log.action.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-900">{log.details}</p>
                    </div>
                    <time className="text-[10px] font-mono text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-4 space-y-6">
          <div className="section-card border-primary/10 shadow-sm">
            <h2 className="section-title mb-6">Ações Rápidas</h2>
            <div className="space-y-3">
              <Button className="w-full justify-start h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 gap-3" onClick={() => navigate('/nova-ata')}>
                <Plus className="w-4 h-4" /> Criar Nova Ata
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl text-sm font-semibold border-muted-foreground/10 hover:bg-muted gap-3" onClick={() => navigate('/historico')}>
                <Clock className="w-4 h-4" /> Ver Histórico
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl text-sm font-semibold border-muted-foreground/10 hover:bg-muted gap-3" onClick={() => navigate('/membros')}>
                <Users className="w-4 h-4" /> Gerenciar Membros
              </Button>
            </div>
          </div>

          <div className="section-card border-primary/10 shadow-sm">
            <h2 className="section-title mb-6">Últimas Atas</h2>
            <div className="space-y-2">
              {store.historico.slice(0, 5).map(ata => (
                <div key={ata.id} className="p-3 rounded-xl bg-muted/20 hover:bg-primary/5 border border-transparent cursor-pointer transition-all" onClick={() => { store.carregarDoHistorico(ata); navigate('/nova-ata'); }}>
                  <p className="text-[12px] font-bold text-slate-900 truncate">{ata.titulo}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{new Date(ata.geradoEm).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {(isAdmin || isMaster) && globalStats && (
            <div className="section-card border-accent/10 shadow-sm">
              <h2 className="section-title flex items-center gap-2 mb-6"><BarChart3 className="w-4 h-4 text-accent-foreground" /> Atas por Igreja</h2>
              <div className="space-y-4">
                {globalStats.atasPorIgreja.map(item => (
                  <div key={item.church_name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">{item.church_name}</span>
                      <span className="font-black text-primary">{item.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (item.count / (globalStats.atasCount || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isMaster && <NewsManager />}
        </div>
      </div>
    </div>
  );
}
