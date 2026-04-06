import { useAtaStore } from "@/hooks/useAtaStore";
import { MemberManagement } from "@/components/MemberManagement";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function MembrosPage({ store }: Props) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Membros</h1>
        <p className="text-sm text-muted-foreground mt-1">{store.membros.length} membro(s) cadastrado(s)</p>
      </div>

      <div className="section-card">
        <MemberManagement
          membros={store.membros}
          membrosPresentes={store.membrosPresentes}
          onAdd={store.addMembro}
          onRemove={store.removeMembro}
          onUpdate={store.updateMembro}
          onTogglePresenca={store.togglePresenca}
          onSetPresentes={store.setMembrosPresentes}
        />

        {store.membros.length > 0 && (
          <div className="mt-6 space-y-2">
            {store.membros.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <p className="font-medium text-foreground">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.cargo} • {m.genero === 'feminino' ? 'Feminino' : 'Masculino'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${store.membrosPresentes.includes(m.nome) ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {store.membrosPresentes.includes(m.nome) ? 'Presente' : 'Ausente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
