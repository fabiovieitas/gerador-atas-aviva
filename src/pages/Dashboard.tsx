import { useAtaStore } from "@/hooks/useAtaStore";
import { FileText, Users, Clock, Plus, Church, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

interface GlobalStats {
  atasCount: number;
  membrosCount: number;
  churchesCount: number;
  atasPorIgreja: { church_name: string, count: number }[];
}

export function DashboardPage({ store }: Props) {
  const navigate = useNavigate();
  const { isAdmin, isMaster } = useAuth();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchGlobalStats();
    }
  }, [isAdmin]);

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

  const stats = isAdmin && globalStats ? [
    { label: "Total de Atas (Global)", value: globalStats.atasCount, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Membros (Global)", value: globalStats.membrosCount, icon: Users, color: "bg-success/10 text-success" },
    { label: "Igrejas Cadastradas", value: globalStats.churchesCount, icon: Church, color: "bg-accent/10 text-accent-foreground" },
  ] : [
    { label: "Atas Geradas", value: store.historico.length, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Membros", value: store.membros.length, icon: Users, color: "bg-success/10 text-success" },
    { label: "Última Ata", value: store.historico[0] ? new Date(store.historico[0].geradoEm).toLocaleDateString('pt-BR') : '—', icon: Clock, color: "bg-accent/10 text-accent-foreground" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Gerador de Atas da Igreja AVIVA</p>
        </div>
        {isAdmin && (
           <Button variant="outline" size="sm" onClick={fetchGlobalStats} className="gap-2">
             <BarChart3 className="w-4 h-4" /> Atualizar Dados
           </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="section-card">
            <h2 className="section-title">Ações Rápidas</h2>
            <div className="space-y-2">
              <Button className="w-full justify-start" onClick={() => navigate('/nova-ata')}>
                <Plus className="w-4 h-4 mr-2" /> Criar Nova Ata
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/historico')}>
                <Clock className="w-4 h-4 mr-2" /> Ver Histórico
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/membros')}>
                <Users className="w-4 h-4 mr-2" /> Gerenciar Membros
              </Button>
            </div>
          </div>

          {isAdmin && globalStats && (
            <div className="section-card">
              <h2 className="section-title flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> Atas por Igreja
              </h2>
              <div className="space-y-3">
                {globalStats.atasPorIgreja.map(item => (
                  <div key={item.church_name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.church_name}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="section-card">
          <h2 className="section-title">Atas Recentes {isAdmin ? "(Geral)" : ""}</h2>
          {store.historico.length === 0 && !isAdmin ? (
            <p className="text-sm text-muted-foreground">Nenhuma ata ainda.</p>
          ) : (
            <div className="space-y-2">
              {store.historico.slice(0, 8).map(ata => (
                <div
                  key={ata.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { store.carregarDoHistorico(ata); navigate('/nova-ata'); }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ata.titulo}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ata.geradoEm).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
