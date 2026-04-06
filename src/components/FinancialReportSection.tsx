import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { AtaFormData, DadosFinanceiros } from "@/types/ata";

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onUpdateMes: (mes: 'mes1' | 'mes2', field: keyof DadosFinanceiros, value: string) => void;
  onSaveDefault: (key: string, value: string) => void;
}

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function MesFields({ mes, data, onChange, label }: { mes: DadosFinanceiros; data: AtaFormData; onChange: (field: keyof DadosFinanceiros, value: string) => void; label: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <h3 className="font-semibold text-foreground">{label}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="form-label">Mês</Label>
          <select value={mes.nome} onChange={e => onChange('nome', e.target.value)} className="w-full px-3 py-2 rounded-md border bg-card text-foreground text-sm">
            <option value="">Selecione...</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="form-label">Ano</Label>
          <Input type="number" value={mes.ano} onChange={e => onChange('ano', e.target.value)} min={2000} />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="form-label">Caixa Inicial</Label>
          <Input value={mes.caixaInicial} onChange={e => onChange('caixaInicial', e.target.value)} placeholder="R$0,00" />
        </div>
        <div>
          <Label className="form-label">Entradas</Label>
          <Input value={mes.entradas} onChange={e => onChange('entradas', e.target.value)} placeholder="R$0,00" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="form-label">Saídas</Label>
          <Input value={mes.saidas} onChange={e => onChange('saidas', e.target.value)} placeholder="R$0,00" />
        </div>
        <div>
          <Label className="form-label">Caixa Final</Label>
          <Input value={mes.caixaFinal} readOnly className="bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function FinancialReportSection({ data, onUpdate, onUpdateMes, onSaveDefault }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Relatório Financeiro</h2>

      <div className="mb-4">
        <Label className="form-label">Tesoureira Responsável</Label>
        <div className="flex gap-2">
          <Input value={data.tesoureira} onChange={e => onUpdate('tesoureira', e.target.value)} placeholder="Nome da Tesoureira" />
          <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('tesoureira', data.tesoureira)}>
            <Save className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Checkbox checked={data.relatorioMultiplosMeses} onCheckedChange={v => onUpdate('relatorioMultiplosMeses', !!v)} id="multiMes" />
        <Label htmlFor="multiMes" className="font-normal">Relatório referente a mais de um mês?</Label>
      </div>

      {data.relatorioMultiplosMeses && (
        <div className="mb-4">
          <Label className="form-label">Descrição do Período</Label>
          <Input value={data.descricaoPeriodo} onChange={e => onUpdate('descricaoPeriodo', e.target.value)} placeholder="Ex: março e abril de 2025" />
        </div>
      )}

      <MesFields mes={data.mes1} data={data} onChange={(f, v) => onUpdateMes('mes1', f, v)} label="Mês 1 do Relatório" />

      {data.relatorioMultiplosMeses && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Checkbox checked={data.incluirMes2} onCheckedChange={v => onUpdate('incluirMes2', !!v)} id="incluirMes2" />
            <Label htmlFor="incluirMes2" className="font-normal">Incluir Mês 2</Label>
          </div>
          {data.incluirMes2 && (
            <MesFields mes={data.mes2} data={data} onChange={(f, v) => onUpdateMes('mes2', f, v)} label="Mês 2 do Relatório" />
          )}
        </div>
      )}

      <div className="mt-4">
        <Label className="form-label">Aprovador do Conselho Fiscal</Label>
        <Input value={data.aprovadorConselhoFiscal} onChange={e => onUpdate('aprovadorConselhoFiscal', e.target.value)} placeholder="Nome do aprovador" />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Checkbox checked={data.aprovacaoFinanceira} onCheckedChange={v => onUpdate('aprovacaoFinanceira', !!v)} id="aprovFinanc" />
        <Label htmlFor="aprovFinanc" className="font-normal">Relatório aprovado pela igreja por unanimidade</Label>
      </div>
    </div>
  );
}
