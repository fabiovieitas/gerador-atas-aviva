import { useAtaStore } from "@/hooks/useAtaStore";
import { FileText, Users, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function DashboardPage({ store }: Props) {
  const navigate = useNavigate();

  const stats = [
    { label: "Atas Geradas", value: store.historico.length, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "Membros", value: store.membros.length, icon: Users, color: "bg-success/10 text-success" },
    { label: "Última Ata", value: store.historico[0] ? new Date(store.historico[0].geradoEm).toLocaleDateString('pt-BR') : '—', icon: Clock, color: "bg-accent/10 text-accent-foreground" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Gerador de Atas da Igreja AVIVA</p>
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

        <div className="section-card">
          <h2 className="section-title">Atas Recentes</h2>
          {store.historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ata ainda.</p>
          ) : (
            <div className="space-y-2">
              {store.historico.slice(0, 5).map(ata => (
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
