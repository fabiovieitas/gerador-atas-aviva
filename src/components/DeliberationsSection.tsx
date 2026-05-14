import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, CheckSquare, Scale } from "lucide-react";
import { useState } from "react";
import { EstatutoSearchModal } from "./EstatutoSearchModal";
import { MemberMentionTextarea } from "@/components/MemberMentionTextarea";
import type { Deliberacao, Membro } from "@/types/ata";

interface Props {
  deliberacoes: Deliberacao[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Deliberacao>) => void;
  onRemove: (id: string) => void;
  membros: Membro[];
  churchInfo?: {
    estatuto_texto?: string;
    regimento_texto?: string;
  } | null;
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

export function DeliberationsSection({ deliberacoes, onAdd, onUpdate, onRemove, membros, churchInfo }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDelId, setActiveDelId] = useState<string | null>(null);

  const openModal = (id: string) => {
    setActiveDelId(id);
    setIsModalOpen(true);
  };

  const handleSelect = (text: string) => {
    if (activeDelId) {
      const del = deliberacoes.find(d => d.id === activeDelId);
      if (del) {
        onUpdate(activeDelId, { texto: inserirFrase(del.texto, text) });
      }
    }
  };
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
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => openModal(del.id)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 gap-1.5 px-2">
                  <Scale className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Citar Base Legal</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(del.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {FRASES_AUXILIO.map((frase, fi) => (
                <button
                  key={frase}
                  type="button"
                  className={`h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${FRASE_COLORS[fi % FRASE_COLORS.length]}`}
                  onClick={() => onUpdate(del.id, { texto: inserirFrase(del.texto, frase) })}
                >
                  {frase.trim()}
                </button>
              ))}
            </div>

            <MemberMentionTextarea
              value={del.texto}
              onChange={(v) => onUpdate(del.id, { texto: v })}
              membros={membros}
              placeholder="Descreva o que foi dito ou deliberado..."
              rows={3}
            />

            {/* Item 8: Toggle de Pendência */}
            <div className="mt-4 pt-4 border-t border-dashed flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`p-1.5 rounded-lg transition-colors ${del.isTask ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'}`}>
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Gerar Pendência</span>
                  <span className="text-[10px] text-muted-foreground leading-none">Criar tarefa para acompanhamento</span>
                </div>
                <input
                  type="checkbox"
                  checked={del.isTask || false}
                  onChange={(e) => onUpdate(del.id, { isTask: e.target.checked })}
                  className="ml-2 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {del.isTask && (
                <div className="flex-1 flex flex-col sm:flex-row gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex-1">
                    <select
                      value={del.taskResponsible || ""}
                      onChange={(e) => onUpdate(del.id, { taskResponsible: e.target.value })}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                    >
                      <option value="">Selecione o Responsável</option>
                      {membros.map(m => (
                        <option key={m.nome} value={m.nome}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:w-40">
                    <input
                      type="date"
                      value={del.taskDeadline || ""}
                      onChange={(e) => onUpdate(del.id, { taskDeadline: e.target.value })}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" onClick={onAdd} className="mt-4 gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" variant="outline">
        <Plus className="w-4 h-4" /> Adicionar registro
      </Button>

      <EstatutoSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        estatutoTexto={churchInfo?.estatuto_texto}
        regimentoTexto={churchInfo?.regimento_texto}
        onSelect={handleSelect}
      />
    </div>
  );
}
