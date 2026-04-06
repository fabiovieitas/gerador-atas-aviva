import { useAtaStore } from "@/hooks/useAtaStore";
import { MeetingInfoSection } from "@/components/MeetingInfoSection";
import { FinancialReportSection } from "@/components/FinancialReportSection";
import { DeliberationsSection } from "@/components/DeliberationsSection";
import { SecretarySection } from "@/components/SecretarySection";
import { MemberManagement } from "@/components/MemberManagement";
import { AtaPreview } from "@/components/AtaPreview";
import { Button } from "@/components/ui/button";
import { FileText, FlaskConical, Eraser, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function NovaAtaPage({ store }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGerar = () => {
    const texto = store.gerarAta();
    store.salvarNoHistorico(texto);
    toast.success("Ata gerada e salva no histórico!");
  };

  const handleTeste = () => {
    store.preencherTeste();
    toast.info("Dados de teste preenchidos!");
  };

  const handleExportar = () => {
    const data = {
      membros: store.membros,
      historico: store.historico,
      defaults: store.defaults,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atas_aviva_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados!");
  };

  const handleImportar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.membros) localStorage.setItem('membrosAvivaAta', JSON.stringify(data.membros));
        if (data.historico) localStorage.setItem('atasAvivaHistorico2025', JSON.stringify(data.historico));
        if (data.defaults) localStorage.setItem('ataDefaults', JSON.stringify(data.defaults));
        toast.success("Dados importados! Recarregue a página para aplicar.");
      } catch {
        toast.error("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleGerar} className="bg-primary text-primary-foreground">
          <FileText className="w-4 h-4 mr-2" /> Gerar Ata
        </Button>
        <Button variant="secondary" onClick={handleTeste}>
          <FlaskConical className="w-4 h-4 mr-2" /> Ata Teste
        </Button>
        <Button variant="secondary" onClick={store.limparFormulario}>
          <Eraser className="w-4 h-4 mr-2" /> Limpar
        </Button>
        <Button variant="outline" onClick={handleExportar}>
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Importar
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportar} />
      </div>

      <MeetingInfoSection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} />
      <FinancialReportSection data={store.formData} onUpdate={store.updateField} onUpdateMes={store.updateMes} onSaveDefault={store.saveDefault} />
      <DeliberationsSection deliberacoes={store.deliberacoes} onAdd={store.addDeliberacao} onUpdate={store.updateDeliberacao} onRemove={store.removeDeliberacao} />

      <div className="section-card">
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
      </div>

      <SecretarySection data={store.formData} onUpdate={store.updateField} onSaveDefault={store.saveDefault} />

      <AtaPreview ataTexto={store.ataGerada} />
    </div>
  );
}
