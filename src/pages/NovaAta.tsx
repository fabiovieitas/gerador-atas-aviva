import { useAtaStore } from "@/hooks/useAtaStore";
import { MeetingInfoSection } from "@/components/MeetingInfoSection";
import { FinancialReportSection } from "@/components/FinancialReportSection";
import { DeliberationsSection } from "@/components/DeliberationsSection";
import { SecretarySection } from "@/components/SecretarySection";
import { MemberManagement } from "@/components/MemberManagement";
import { AtaEditor } from "@/components/AtaEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FlaskConical, Eraser, Info, DollarSign, MessageSquare, Users, PenTool, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function NovaAtaPage({ store }: Props) {
  const [originalTexto, setOriginalTexto] = useState('');
  const { formData, membrosPresentes } = store;

  const checklist = [
    { label: "Data da reunião preenchida", ok: Boolean(formData.dataReuniao) },
    { label: "Horário de início preenchido", ok: Boolean(formData.horaInicio) },
    { label: "Dirigente selecionado", ok: Boolean(formData.pastorDirigente) },
    { label: "Secretário(a) selecionado(a)", ok: Boolean(formData.nomeSecretario) },
    { label: "Tesoureiro(a) selecionado(a)", ok: Boolean(formData.tesoureira) },
    { label: "Pelo menos 1 membro presente", ok: membrosPresentes.length > 0 },
  ];

  const itensConferidos = checklist.filter((item) => item.ok).length;

  const handleGerar = () => {
    const texto = store.gerarAta();
    setOriginalTexto(texto);
    store.salvarNoHistorico(texto);
    toast.success("Ata gerada e salva no histórico!");
  };

  const handleTeste = () => {
    store.preencherTeste();
    toast.info("Dados de teste preenchidos!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGerar} className="gap-2">
          <FileText className="w-4 h-4" /> Gerar Ata
        </Button>
        <Button variant="secondary" onClick={handleTeste} className="gap-2">
          <FlaskConical className="w-4 h-4" /> Ata Teste
        </Button>
        <Button variant="secondary" onClick={store.limparFormulario} className="gap-2">
          <Eraser className="w-4 h-4" /> Limpar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="section-card space-y-3">
          <h2 className="section-title">Como usar (rápido)</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Preencha os dados nas abas (Informações, Financeiro, Presença e Secretário).</li>
            <li>Clique em "Gerar Ata" para montar o texto automaticamente.</li>
            <li>Revise no editor, depois copie ou baixe em Word.</li>
          </ol>
        </div>

        <div className="section-card space-y-3">
          <h2 className="section-title">Checklist antes de gerar</h2>
          <p className="text-sm text-muted-foreground">
            {itensConferidos} de {checklist.length} item(ns) conferido(s).
          </p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Info className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Informações</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="deliberacoes" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Deliberações</span>
          </TabsTrigger>
          <TabsTrigger value="membros" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Presença</span>
          </TabsTrigger>
          <TabsTrigger value="secretario" className="gap-1.5 text-xs sm:text-sm py-2.5">
            <PenTool className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Secretário</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <MeetingInfoSection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} />
        </TabsContent>

        <TabsContent value="financeiro">
          <FinancialReportSection data={store.formData} onUpdate={store.updateField} onUpdateMes={store.updateMes} onSaveDefault={store.saveDefault} />
        </TabsContent>

        <TabsContent value="deliberacoes">
          <DeliberationsSection deliberacoes={store.deliberacoes} onAdd={store.addDeliberacao} onUpdate={store.updateDeliberacao} onRemove={store.removeDeliberacao} />
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
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.cargo}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${store.membrosPresentes.includes(m.nome) ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {store.membrosPresentes.includes(m.nome) ? '✓ Presente' : 'Ausente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="secretario">
          <SecretarySection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} />
        </TabsContent>
      </Tabs>

      {/* Editor / Preview */}
      <AtaEditor
        ataTexto={store.ataGerada}
        onUpdate={store.setAtaGerada}
        originalTexto={originalTexto}
      />
    </div>
  );
}
