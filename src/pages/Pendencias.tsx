import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAtaStore } from "@/hooks/useAtaStore";
import { CheckCircle2, Circle, Clock, User, Calendar, Trash2, Filter, Search, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Task {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  data_limite: string;
  status: 'pendente' | 'concluido';
  created_at: string;
  ata_id: string | null;
  church_id: string;
}

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function PendenciasPage({ store }: Props) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'concluido'>('pendente');
  const [search, setSearch] = useState("");

  const fetchTasks = async () => {
    if (!store.selectedChurchId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assembly_tasks')
        .select('*')
        .eq('church_id', store.selectedChurchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as Task[]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar pendências.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [store.selectedChurchId]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'pendente' ? 'concluido' : 'pendente';
    try {
      const { error } = await supabase
        .from('assembly_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success(newStatus === 'concluido' ? "Tarefa concluída!" : "Tarefa marcada como pendente.");
    } catch (err) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente apagar esta pendência?")) return;
    try {
      const { error } = await supabase.from('assembly_tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success("Pendência removida.");
    } catch (err) {
      toast.error("Erro ao remover pendência.");
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          t.responsavel.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = tasks.filter(t => t.status === 'pendente').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Pendências e Decisões</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe as tarefas geradas nas reuniões</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
            {pendingCount} Pendentes
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou responsável..."
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="concluido">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-dashed">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Carregando pendências...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-dashed text-center px-6">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Tudo em dia!</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Não encontramos nenhuma pendência para os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map(task => {
            const isLate = task.status === 'pendente' && task.data_limite && new Date(task.data_limite) < new Date();
            return (
              <div 
                key={task.id} 
                className={`group relative flex items-start gap-4 p-4 rounded-2xl border bg-card transition-all hover:shadow-md ${task.status === 'concluido' ? 'opacity-70 bg-muted/30' : ''} ${isLate ? 'border-red-200 bg-red-50/30' : ''}`}
              >
                <button 
                  onClick={() => handleToggleStatus(task)}
                  className={`mt-1 shrink-0 transition-colors ${task.status === 'concluido' ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                >
                  {task.status === 'concluido' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-sm sm:text-base truncate ${task.status === 'concluido' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.titulo}
                    </h3>
                    {isLate && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Atrasado
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {task.descricao}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <User className="w-3.5 h-3.5" />
                      {task.responsavel || "Sem responsável"}
                    </div>
                    {task.data_limite && (
                      <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isLate ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        Prazo: {new Date(task.data_limite).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Criado em {new Date(task.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(task.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-full transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
        <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0 h-fit">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-amber-800">Como funcionam as Pendências?</h4>
          <p className="text-xs text-amber-700 leading-relaxed mt-1">
            As pendências são geradas automaticamente quando você marca um registro na **Nova Ata** como "Pendência". 
            Aqui você pode marcar como concluído ou excluir tarefas que já foram resolvidas. 
            Tarefas com prazo vencido aparecerão destacadas em vermelho.
          </p>
        </div>
      </div>
    </div>
  );
}
