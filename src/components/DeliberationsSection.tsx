import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { Deliberacao } from "@/types/ata";

interface Props {
  deliberacoes: Deliberacao[];
  onAdd: () => void;
  onUpdate: (id: string, texto: string) => void;
  onRemove: (id: string) => void;
}

export function DeliberationsSection({ deliberacoes, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Outras Deliberações / Ocorrências</h2>

      <div className="space-y-3">
        {deliberacoes.map((del, i) => (
          <div key={del.id} className="relative p-3 border border-dashed rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Deliberação {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(del.id)} className="text-destructive hover:text-destructive h-7 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Textarea
              value={del.texto}
              onChange={e => onUpdate(del.id, e.target.value)}
              placeholder="Descreva a deliberação..."
              rows={2}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={onAdd} className="mt-3">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Deliberação
      </Button>
    </div>
  );
}
