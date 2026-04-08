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

const FRASES_AUXILIO = [
  "Ainda com a palavra, ",
  "Com a oportunidade da palavra, ",
  "Dando continuidade, ",
  "Em seguida, ",
  "Na sequência, ",
  "Posteriormente, ",
  "Convidando a palavra, ",
  "Após breve orientação do dirigente, ",
  "Registrando a participação, ",
  "Para complementar o assunto, ",
  "Com observações finais, ",
  "Encerrando esse tópico, ",
];

function inserirFrase(textoAtual: string, frase: string) {
  const t = textoAtual.trim();
  if (!t) return frase;
  if (t.endsWith(" ")) return t + frase;
  return `${t} ${frase}`;
}

export function DeliberationsSection({ deliberacoes, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Oportunidades da palavra</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Registre falas de outras pessoas (além do dirigente), de forma organizada. Use os botões abaixo para
        ajudar a redigir a ata.
      </p>

      <div className="space-y-3">
        {deliberacoes.map((del, i) => (
          <div key={del.id} className="relative p-3 border border-dashed rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Oportunidade {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(del.id)} className="text-destructive hover:text-destructive h-7 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {FRASES_AUXILIO.map((frase) => (
                <Button
                  key={frase}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onUpdate(del.id, inserirFrase(del.texto, frase))}
                >
                  {frase.trim()}
                </Button>
              ))}
            </div>

            <Textarea
              value={del.texto}
              onChange={(e) => onUpdate(del.id, e.target.value)}
              placeholder="Descreva o que foi dito nesta oportunidade..."
              rows={3}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={onAdd} className="mt-3">
        <Plus className="w-4 h-4 mr-2" /> Adicionar oportunidade
      </Button>
    </div>
  );
}
