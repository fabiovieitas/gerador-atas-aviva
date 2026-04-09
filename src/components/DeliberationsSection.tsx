import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { MemberMentionTextarea } from "@/components/MemberMentionTextarea";
import type { Deliberacao, Membro } from "@/types/ata";

interface Props {
  deliberacoes: Deliberacao[];
  onAdd: () => void;
  onUpdate: (id: string, texto: string) => void;
  onRemove: (id: string) => void;
  membros: Membro[];
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

const FRASE_COLORS = [
  "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-lime-100 text-lime-700 hover:bg-lime-200 dark:bg-lime-900/30 dark:text-lime-300",
  "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300",
];

function inserirFrase(textoAtual: string, frase: string) {
  const t = textoAtual.trim();
  if (!t) return frase;
  if (t.endsWith(" ")) return t + frase;
  return `${t} ${frase}`;
}

export function DeliberationsSection({ deliberacoes, onAdd, onUpdate, onRemove, membros }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Registros da Assembleia</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Registre falas, comunicados e deliberações ocorridas durante a assembleia. Use <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">@</kbd> para mencionar membros.
      </p>

      <div className="space-y-4">
        {deliberacoes.map((del, i) => (
          <div key={del.id} className="relative p-4 border rounded-xl bg-gradient-to-br from-card to-muted/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                <span className="text-sm font-semibold text-foreground">Registro {i + 1}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(del.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-full">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {FRASES_AUXILIO.map((frase, fi) => (
                <button
                  key={frase}
                  type="button"
                  className={`h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${FRASE_COLORS[fi % FRASE_COLORS.length]}`}
                  onClick={() => onUpdate(del.id, inserirFrase(del.texto, frase))}
                >
                  {frase.trim()}
                </button>
              ))}
            </div>

            <MemberMentionTextarea
              value={del.texto}
              onChange={(v) => onUpdate(del.id, v)}
              membros={membros}
              placeholder="Descreva o que foi dito ou deliberado..."
              rows={3}
            />
          </div>
        ))}
      </div>

      <Button type="button" onClick={onAdd} className="mt-4 gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" variant="outline">
        <Plus className="w-4 h-4" /> Adicionar registro
      </Button>
    </div>
  );
}
