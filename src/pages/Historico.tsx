import { useAtaStore } from "@/hooks/useAtaStore";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Eye, Clock } from "lucide-react";
import type { AtaHistorico } from "@/types/ata";

interface Props {
  store: ReturnType<typeof useAtaStore>;
  onCarregar: () => void;
}

export function HistoricoPage({ store, onCarregar }: Props) {
  const handleCarregar = (ata: AtaHistorico) => {
    store.carregarDoHistorico(ata);
    onCarregar();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Atas Anteriores</h1>
          <p className="text-sm text-muted-foreground mt-1">{store.historico.length} ata(s) salva(s)</p>
        </div>
      </div>

      {store.historico.length === 0 ? (
        <div className="section-card text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma ata salva ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Gere uma ata na página "Nova Ata" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {store.historico.map(ata => (
            <div key={ata.id} className="section-card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{ata.titulo}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Gerada em {new Date(ata.geradoEm).toLocaleString('pt-BR')}</span>
                  <span>• {ata.membrosPresentes.length} presentes</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => handleCarregar(ata)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Abrir
                </Button>
                <Button size="sm" variant="destructive" onClick={() => store.excluirDoHistorico(ata.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
