import { useMemo } from "react";
import { Scale, CheckCircle2, AlertTriangle, Users, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  totalMembrosAtivos: number;
  membrosPresentesCount: number;
  tipoAssembleia: "Ordinária" | "Extraordinária";
  semQuorum: boolean;
  horaInicio: string;
  horaSegundaChamada: string;
  onUpdateSemQuorum: (semQuorum: boolean) => void;
  onUpdateHoraSegundaChamada: (hora: string) => void;
}

export function QuorumAdvisor({
  totalMembrosAtivos,
  membrosPresentesCount,
  tipoAssembleia,
  semQuorum,
  horaInicio,
  horaSegundaChamada,
  onUpdateSemQuorum,
  onUpdateHoraSegundaChamada,
}: Props) {
  // Cálculo de Quórum Canônico
  const quorumStats = useMemo(() => {
    const total = Math.max(totalMembrosAtivos, 1);
    const presentes = membrosPresentesCount;
    const porcentagem = Math.min(100, Math.round((presentes / total) * 100));

    // Maioria Simples: 50% + 1 dos membros ativos
    const maioriaSimples = Math.floor(total / 2) + 1;

    // Quórum Qualificado: 2/3 dos membros ativos (Artigo 53 para reformas/imóveis)
    const doisTercos = Math.ceil((2 * total) / 3);

    const temMaioriaSimples = presentes >= maioriaSimples;
    const temDoisTercos = presentes >= doisTercos;

    return {
      porcentagem,
      maioriaSimples,
      doisTercos,
      temMaioriaSimples,
      temDoisTercos,
      faltamMaioria: Math.max(0, maioriaSimples - presentes),
      faltamDoisTercos: Math.max(0, doisTercos - presentes),
    };
  }, [totalMembrosAtivos, membrosPresentesCount]);

  // Sugestão de horário da 2ª chamada (+15 min do início)
  const sugerirSegundaChamada = () => {
    if (!horaInicio) {
      onUpdateHoraSegundaChamada("19:45");
      return;
    }
    const [h, m] = horaInicio.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    let novaMin = m + 15;
    let novaHora = h;
    if (novaMin >= 60) {
      novaHora = (h + 1) % 24;
      novaMin = novaMin - 60;
    }
    const fmtHora = `${String(novaHora).padStart(2, "0")}:${String(novaMin).padStart(2, "0")}`;
    onUpdateHoraSegundaChamada(fmtHora);
    onUpdateSemQuorum(true);
  };

  return (
    <div className="section-card border-primary/20 bg-gradient-to-br from-card to-primary/5 p-4 rounded-xl space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              Consultor de Quórum Estatutário
              <Badge variant="outline" className="text-[10px] font-mono">
                Art. 53 do Estatuto
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Análise em tempo real com base no Estatuto Social da Igreja AVIVA
            </p>
          </div>
        </div>

        {/* Status Badge Principal */}
        {semQuorum ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> 2ª Convocação Ativada
          </Badge>
        ) : quorumStats.temMaioriaSimples ? (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Quórum Regular (1ª Convocação)
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Abaixo de 50% + 1
          </Badge>
        )}
      </div>

      {/* Barra de Progresso Visual de Presença */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Presentes:{" "}
            <strong className="text-foreground">{membrosPresentesCount}</strong> de{" "}
            <strong>{totalMembrosAtivos}</strong> membros ativos
          </span>
          <span className="font-bold text-foreground">{quorumStats.porcentagem}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              quorumStats.temDoisTercos
                ? "bg-emerald-600"
                : quorumStats.temMaioriaSimples
                ? "bg-primary"
                : "bg-amber-500"
            }`}
            style={{ width: `${quorumStats.porcentagem}%` }}
          />
          {/* Marcador 50% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-black/40 dark:bg-white/40"
            style={{ left: "50%" }}
            title="50% dos membros"
          />
          {/* Marcador 2/3 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-800/60 dark:bg-emerald-400/60"
            style={{ left: "66.6%" }}
            title="2/3 dos membros (Quórum Qualificado)"
          />
        </div>
      </div>

      {/* Grid de Diagnósticos Jurídicos */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {/* Maioria Simples (50% + 1) */}
        <div className="p-3 rounded-lg border bg-background/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground">Maioria Absoluta (50% + 1)</span>
            <span className="font-mono font-bold text-foreground">
              {membrosPresentesCount}/{quorumStats.maioriaSimples}
            </span>
          </div>
          <p className="text-muted-foreground leading-snug">
            {quorumStats.temMaioriaSimples ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Aprovada para abertura em 1ª convocação.
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                Faltam {quorumStats.faltamMaioria} membro(s) para instalar em 1ª convocação.
              </span>
            )}
          </p>
        </div>

        {/* Quórum Qualificado (2/3) */}
        <div className="p-3 rounded-lg border bg-background/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground">Quórum Qualificado (2/3)</span>
            <span className="font-mono font-bold text-foreground">
              {membrosPresentesCount}/{quorumStats.doisTercos}
            </span>
          </div>
          <p className="text-muted-foreground leading-snug">
            {quorumStats.temDoisTercos ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Habilitado para alienação de bens e reforma estatutária.
              </span>
            ) : (
              <span>Necessário apenas para destituição, reforma ou venda de bens.</span>
            )}
          </p>
        </div>
      </div>

      {/* Ação de 2ª Convocação se necessário */}
      {!quorumStats.temMaioriaSimples && !semQuorum && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Pelo <strong>Parágrafo Único do Art. 53</strong>, caso não haja quórum de 50%+1 na 1ª chamada, a
              assembleia pode ser instalada em <strong>2ª convocação</strong> com os membros presentes.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={sugerirSegundaChamada}
            className="text-xs border-amber-600/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 shrink-0"
          >
            Ativar 2ª Convocação (+15 min)
          </Button>
        </div>
      )}

      {/* Se já estiver em 2ª chamada, mostra aviso e campo de horário */}
      {semQuorum && (
        <div className="p-3 rounded-lg bg-muted/60 border flex items-center justify-between gap-2">
          <div className="text-xs space-y-0.5">
            <span className="font-semibold text-foreground">Instalada em 2ª Convocação</span>
            <p className="text-muted-foreground">
              A ata registrará o horário da 2ª chamada conforme o Estatuto:{" "}
              <strong className="text-foreground">{horaSegundaChamada || "A definir"}</strong>
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUpdateSemQuorum(false)}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Reverter para 1ª
          </Button>
        </div>
      )}
    </div>
  );
}

