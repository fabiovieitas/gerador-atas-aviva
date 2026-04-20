import { useAtaStore } from "@/hooks/useAtaStore";
import { MeetingInfoSection } from "@/components/MeetingInfoSection";
import { FinancialReportSection } from "@/components/FinancialReportSection";
import { DeliberationsSection } from "@/components/DeliberationsSection";
import { SecretarySection } from "@/components/SecretarySection";
import { MemberManagement } from "@/components/MemberManagement";
import { AtaEditor } from "@/components/AtaEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FlaskConical, Eraser, Info, DollarSign, MessageSquare, Users, PenTool, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function NovaAtaPage({ store }: Props) {
  const [originalTexto, setOriginalTexto] = useState('');
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const { formData, membrosPresentes, membros } = store;

  // Verifica se existe rascunho ao montar o componente
  useEffect(() => {
    const isDirty = 
      formData.dataReuniao !== '' || 
      formData.assuntosPrincipais !== '' || 
      formData.pastorDirigente !== '' ||
      membrosPresentes.length > 0;

    if (isDirty) {
      setShowDraftDialog(true);
    }
  }, []); // Só executa ao entrar na página

  const handleStartNew = () => {
    store.limparFormulario();
    setShowDraftDialog(false);
    toast.info("Iniciando nova ata.");
  };

  const handleContinueDraft = () => {
    setShowDraftDialog(false);
    toast.info("Continuando rascunho anterior.");
  };

  const checklist = [
    { label: "Data da reunião preenchida", ok: Boolean(formData.dataReuniao) },
    { label: "Horário de início preenchido", ok: Boolean(formData.horaInicio) },
    { label: "Dirigente selecionado", ok: Boolean(formData.pastorDirigente) },
    { label: "Secretário(a) selecionado(a)", ok: Boolean(formData.nomeSecretario) },
    { label: "Tesoureiro(a) selecionado(a)", ok: Boolean(formData.tesoureira) },
    { label: "Pelo menos 1 membro presente", ok: membrosPresentes.length > 0 },
  ];

  const itensConferidos = checklist.filter((item) => item.ok).length;
  const checklistCompleto = itensConferidos === checklist.length;

  const signatureData = useMemo(() => {
    const secMembro = membros.find(m => m.nome === formData.nomeSecretario);
    const presMembro = membros.find(m => m.nome === formData.pastorDirigente);
    return {
      secretarioNome: formData.nomeSecretario || '___',
      secretarioCargo: secMembro?.cargo || (secMembro?.genero === 'feminino' ? 'Secretária' : 'Secretário'),
      presidenteNome: formData.pastorDirigente || '___',
      presidenteCargo: presMembro?.cargo || '1º Dirigente e Pastor',
    };
  }, [formData.nomeSecretario, formData.pastorDirigente, membros]);

  const handleGerar = () => {
    if (!checklistCompleto) {
      toast.error("Preencha todos os itens do checklist antes de gerar a ata.");
      return;
    }
    const texto = store.gerarAta();
    setOriginalTexto(texto);
    store.salvarNoHistorico(texto);
    toast.success("Ata gerada e salva no histórico!");
  };

  const handleTeste = () => {
    store.preencherTeste();
    toast.info("Dados de teste preenchidos!");
  };

  const handleLimpar = () => {
    const confirmar = window.confirm("Deseja limpar todos os dados desta ata?");
    if (!confirmar) return;
    store.limparFormulario();
    toast.info("Formulário limpo.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Rascunho em andamento
            </DialogTitle>
            <DialogDescription>
              Identificamos que você já iniciou o preenchimento de uma ata. Deseja continuar de onde parou ou iniciar uma nova do zero?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={handleStartNew} className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10">
              Limpar e Iniciar Nova
            </Button>
            <Button onClick={handleContinueDraft} className="flex-1">
              Continuar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGerar} disabled={!checklistCompleto} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          <FileText className="w-4 h-4" /> Gerar Ata
        </Button>
        <Button variant="secondary" onClick={handleTeste} className="gap-2 px-4 py-2.5 text-sm">
          <FlaskConical className="w-4 h-4" /> Ata Teste
        </Button>
        <Button variant="outline" onClick={handleLimpar} className="gap-2 px-4 py-2.5 text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Eraser className="w-4 h-4" /> Limpar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="section-card space-y-3">
          <h2 className="section-title">Como usar (rápido)</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Preencha os dados nas abas abaixo.</li>
            <li>Clique em <strong>"Gerar Ata"</strong> para montar o texto.</li>
            <li>Revise no editor, depois copie ou baixe em Word.</li>
          </ol>
          <p className="text-xs text-muted-foreground/70 mt-2">💡 Dica: Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">@</kbd> nos campos de texto para mencionar membros rapidamente.</p>
        </div>

        <div className="section-card space-y-3">
          <h2 className="section-title">Checklist antes de gerar</h2>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all duration-300" style={{ width: `${(itensConferidos / checklist.length) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{itensConferidos}/{checklist.length}</span>
          </div>
          <div className="space-y-1.5">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={item.ok ? "text-foreground" : "text-muted-foreground/60"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Info className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Informações</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5 text-xs sm:text-sm py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="deliberacoes" className="gap-1.5 text-xs sm:text-sm py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Registros</span>
          </TabsTrigger>
          <TabsTrigger value="membros" className="gap-1.5 text-xs sm:text-sm py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Presença</span>
          </TabsTrigger>
          <TabsTrigger value="secretario" className="gap-1.5 text-xs sm:text-sm py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
            <PenTool className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Secretário</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <MeetingInfoSection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} membros={store.membros} />
        </TabsContent>

        <TabsContent value="financeiro">
          <FinancialReportSection data={store.formData} onUpdate={store.updateField} onUpdateMes={store.updateMes} onSaveDefault={store.saveDefault} membros={store.membros} />
        </TabsContent>

        <TabsContent value="deliberacoes">
          <DeliberationsSection deliberacoes={store.deliberacoes} onAdd={store.addDeliberacao} onUpdate={store.updateDeliberacao} onRemove={store.removeDeliberacao} membros={store.membros} />
        </TabsContent>

        <TabsContent value="membros">
          <div className="section-card space-y-4">
            <h2 className="section-title">Membros e Presença</h2>
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
              <div className="space-y-2 mt-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  {store.membrosPresentes.length} de {store.membros.length} presente(s)
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {store.membros.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => store.togglePresenca(m.nome)}
                      title="Clique para marcar ou desmarcar presença"
                      className={`flex w-full items-center justify-between p-3 rounded-lg border transition-all text-left ${store.membrosPresentes.includes(m.nome) ? 'bg-success/5 border-success/30 hover:bg-success/10' : 'bg-card hover:bg-muted/40'}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.cargo}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-medium ${store.membrosPresentes.includes(m.nome) ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {store.membrosPresentes.includes(m.nome) ? '✓ Presente' : 'Ausente'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="secretario">
          <SecretarySection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} membros={store.membros} />
        </TabsContent>
      </Tabs>

      {/* Editor / Preview */}
      <AtaEditor
        ataTexto={store.ataGerada}
        onUpdate={store.setAtaGerada}
        originalTexto={originalTexto}
        signatureData={signatureData}
      />
    </div>
  );
}
