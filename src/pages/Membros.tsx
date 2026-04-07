import { useAtaStore } from "@/hooks/useAtaStore";
import { MemberManagement } from "@/components/MemberManagement";
import { MemberUpload } from "@/components/MemberUpload";
import { Users } from "lucide-react";
import type { Membro } from "@/types/ata";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function MembrosPage({ store }: Props) {
  const handleBulkImport = (novos: Membro[]) => {
    novos.forEach(m => store.addMembro(m));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Membros</h1>
        <p className="text-sm text-muted-foreground mt-1">{store.membros.length} membro(s) cadastrado(s)</p>
      </div>

      <div className="section-card space-y-4">
        <h2 className="section-title">Gerenciar Membros</h2>
        <div className="flex flex-wrap gap-3">
          <MemberManagement
            membros={store.membros}
            membrosPresentes={store.membrosPresentes}
            onAdd={store.addMembro}
            onRemove={store.removeMembro}
            onUpdate={store.updateMembro}
            onTogglePresenca={store.togglePresenca}
            onSetPresentes={store.setMembrosPresentes}
          />
        </div>
      </div>

      <div className="section-card space-y-4">
        <h2 className="section-title">Importar Lista de Membros</h2>
        <MemberUpload onImport={handleBulkImport} existingMembros={store.membros} />
      </div>

      {store.membros.length > 0 && (
        <div className="section-card">
          <h2 className="section-title flex items-center gap-2">
            <Users className="w-5 h-5" /> Lista Completa
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {store.membros.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.cargo} • {m.genero === 'feminino' ? 'Feminino' : 'Masculino'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${store.membrosPresentes.includes(m.nome) ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {store.membrosPresentes.includes(m.nome) ? 'Presente' : 'Ausente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {store.membros.length === 0 && (
        <div className="section-card text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum membro cadastrado.</p>
          <p className="text-sm text-muted-foreground mt-1">Use os botões acima para adicionar ou importar membros.</p>
        </div>
      )}
    </div>
  );
}
