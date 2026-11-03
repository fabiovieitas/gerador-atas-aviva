import { useAtaStore } from "@/hooks/useAtaStore";
import { MeetingInfoSection, safeParseArray } from "@/components/MeetingInfoSection";
import { FinancialReportSection } from "@/components/FinancialReportSection";
import { DeliberationsSection } from "@/components/DeliberationsSection";
import { SecretarySection } from "@/components/SecretarySection";
import { MemberManagement } from "@/components/MemberManagement";
import { AtaEditor } from "@/components/AtaEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FlaskConical, Eraser, Info, DollarSign, MessageSquare, Users, PenTool, CheckCircle2, Circle, AlertCircle, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PresencaQR } from "@/components/PresencaQR";
import { QuorumAdvisor } from "@/components/QuorumAdvisor";
import { AudioMeetingRecorder } from "@/components/AudioMeetingRecorder";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function NovaAtaPage({ store }: Props) {
  const { profile } = useAuth();
  const location = useLocation();
  const [originalTexto, setOriginalTexto] = useState('');
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [searchParams] = useSearchParams();
  const ataIdParam = searchParams.get('ata');

  // Load ata by ID if present in URL
  useEffect(() => {
    if (ataIdParam && typeof store.currentAtaId !== 'string') {
      store.loadAta(ataIdParam);
    }
  }, [ataIdParam, store]);

  // Check for pre-fill data from Agenda
  useEffect(() => {
    if (location.state?.preFill) {
      const data = location.state.preFill;
      Object.keys(data).forEach((key) => {
        store.updateField(key as any, data[key]);
      });
      toast.success("Dados da reunião carregados da Agenda!");
      // Limpa o state para não preencher de novo se recarregar
      window.history.replaceState({}, document.title);
    }
  }, [location.state, store]);
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
    const titulo = formData.tituloDirigente || store.defaults?.tituloDirigente || 'Presbítero';
    return {
      secretarioNome: formData.nomeSecretario || '___',
      secretarioCargo: secMembro?.cargo || (secMembro?.genero === 'feminino' ? 'Secretária' : 'Secretário'),
      presidenteNome: formData.pastorDirigente || '___',
      presidenteCargo: `${titulo} - Dirigente da Assembleia`,
    };
  }, [formData.nomeSecretario, formData.pastorDirigente, formData.tituloDirigente, store.defaults?.tituloDirigente, membros]);

  const handleGerar = () => {
    if (!checklistCompleto) {
      toast.error("Preencha todos os itens do checklist antes de gerar a ata.");
      return;
    }
    const texto = store.gerarAta();
    setOriginalTexto(texto);
    store.setAtaGerada(texto); // Atualiza o estado para a pré-visualização aparecer
    store.salvarNoHistorico(texto);
    toast.success("Ata gerada e salva no histórico!");
  };

  const handleTeste = () => {
    store.preencherTeste();
    toast.info("Dados de teste preenchidos!");
  };

  const handleApplyAudio = (dados: {
    assuntosPrincipais?: string;
    deliberacoes?: string[];
    palavraInicial?: string;
    textoCorrido?: string;
    tags?: string[];
  }) => {
    // 1. Atualiza Assuntos Principais
    if (dados.assuntosPrincipais) {
      store.updateField('assuntosPrincipais', dados.assuntosPrincipais);
    }
    
    // 2. Atualiza Palavra Inicial
    if (dados.palavraInicial) {
      store.updateField('palavraInicial', dados.palavraInicial);
    }

    // 3. Atualiza Palavras-chave / Tags identificadas
    if (dados.tags && dados.tags.length > 0) {
      const current = store.formData.tags || [];
      const merged = Array.from(new Set([...current, ...dados.tags]));
      store.updateField('tags', merged);
    }

    // 4. Adiciona as Deliberações identificadas
    if (dados.deliberacoes && dados.deliberacoes.length > 0) {
      const novasDelib = dados.deliberacoes.map((itemTexto, idx) => ({
        id: (Date.now() + idx).toString(),
        texto: itemTexto
      }));
      store.updateField('deliberacoes', [
        ...store.formData.deliberacoes.filter(d => d.texto?.trim()),
        ...novasDelib
      ]);
    }

    // 4. Insere o texto formal no Editor de Ata
    if (dados.textoCorrido) {
      const textoAtual = store.ataGerada?.trim() || "";
      const novoTexto = textoAtual
        ? `${textoAtual}\n\n[DELIBERAÇÕES E RELATO DA REUNIÃO]\n${dados.textoCorrido}`
        : dados.textoCorrido;
      store.setAtaGerada(novoTexto);
      setOriginalTexto(novoTexto);
    } else {
      const texto = store.gerarAta();
      store.setAtaGerada(texto);
      setOriginalTexto(texto);
    }

    // 5. Muda para a aba de Deliberações para mostrar visualmente o resultado
    setActiveTab('deliberacoes');

    // 6. Rola a tela até o preview da ata
    setTimeout(() => {
      const editorElement = document.getElementById('ata-editor-container');
      if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 200);

    toast.success("✅ Tópicos, deliberações e texto da ata preenchidos com sucesso!");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGerar} disabled={!checklistCompleto} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            <FileText className="w-4 h-4" /> 
            {typeof store.currentAtaId === 'string' ? 'Gerar e Atualizar Ata' : 'Gerar Ata'}
          </Button>
          <Button variant="secondary" onClick={handleTeste} className="gap-2 px-4 py-2.5 text-sm">
            <FlaskConical className="w-4 h-4" /> Ata Teste
          </Button>
          <Button variant="outline" onClick={() => { store.loadDefaults(); toast.success("Padrões carregados!"); }} className="gap-2 px-4 py-2.5 text-sm border-primary/30 text-primary hover:bg-primary/5">
            <PenTool className="w-4 h-4" /> Carregar Padrões
          </Button>
          <Button variant="outline" onClick={handleLimpar} className="gap-2 px-4 py-2.5 text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Eraser className="w-4 h-4" /> Limpar
          </Button>
          <AudioMeetingRecorder churchId={store.selectedChurchId || undefined} onApplyToAta={handleApplyAudio} />
        </div>

        {typeof store.currentAtaId === 'string' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 animate-in fade-in zoom-in duration-300">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Editando Ata Existente</span>
          </div>
        )}
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

      {/* Consultor de Quórum Estatutário em Tempo Real */}
      <QuorumAdvisor
        totalMembrosAtivos={store.membros.filter(m => m.ativo !== false).length}
        membrosPresentesCount={store.membrosPresentes.length}
        tipoAssembleia={store.formData.tipoAssembleia}
        semQuorum={store.formData.semQuorum}
        horaInicio={store.formData.horaInicio}
        horaSegundaChamada={store.formData.horaSegundaChamada}
        onUpdateSemQuorum={(val) => store.updateField("semQuorum", val)}
        onUpdateHoraSegundaChamada={(hora) => store.updateField("horaSegundaChamada", hora)}
      />

      {/* Barra Sempre Visível de Palavras-Chave e Temas da Ata */}
      {(() => {
        const currentTags = safeParseArray(store.formData.tags);
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-card border shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Palavras-chave da Ata:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {currentTags.length > 0 ? (
                  currentTags.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentTags.filter((item) => item !== t);
                          store.updateField("tags", updated);
                        }}
                        className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                        title="Remover palavra-chave"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Nenhuma palavra-chave selecionada ainda (ex: #Desligamento, #Financeiro, #Retiro, #Reforma).
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("info")}
              className="text-xs text-primary h-7 gap-1"
            >
              Gerenciar Tags
            </Button>
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <MeetingInfoSection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} membros={store.membros} membrosPresentes={store.membrosPresentes} />
        </TabsContent>

        <TabsContent value="financeiro">
          <FinancialReportSection data={store.formData} onUpdate={store.updateField} onUpdateMes={store.updateMes} onSaveDefault={store.saveDefault} membros={store.membros} />
        </TabsContent>

        <TabsContent value="deliberacoes">
          <DeliberationsSection 
            deliberacoes={store.deliberacoes} 
            onAdd={store.addDeliberacao} 
            onUpdate={store.updateDeliberacao} 
            onRemove={store.removeDeliberacao} 
            membros={store.membros} 
            churchInfo={store.churchInfo}
          />
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
            
            {/* QR Code para 2º secretário marcar presenças via celular */}
            <PresencaQR
              membros={store.membros.filter(m => m.ativo)}
              membrosPresentes={store.membrosPresentes}
              churchId={profile?.church_id || (store.churchInfo as any)?.id || '42bae3aa-a780-4826-b190-eb0b491d69d4'}
              churchNome={store.churchInfo?.nome || 'Igreja Evangélica AVIVA'}
              onSync={store.setMembrosPresentes}
              sessionId={store.presenceSessionId}
              setSessionId={store.setPresenceSessionId}
              fotosAssinaturaUrls={store.formData.fotosAssinaturaUrls || []}
            />

            {store.membros.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  {store.membrosPresentes.length} de {store.membros.length} presente(s)
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {store.membros.filter(m => m.ativo).map((m, i) => (
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
      <div id="ata-editor-container">
        <AtaEditor
        ataTexto={store.ataGerada}
        onUpdate={store.setAtaGerada}
        originalTexto={originalTexto}
        signatureData={signatureData}
        churchInfo={store.churchInfo}
        />
      </div>
    </div>
  );
}
