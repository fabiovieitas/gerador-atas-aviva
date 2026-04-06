import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { AtaFormData } from "@/types/ata";

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onSaveDefault: (key: string, value: string) => void;
}

export function MeetingInfoSection({ data, onUpdate, onSaveDefault }: Props) {
  const now = () => new Date().toTimeString().slice(0, 5);

  return (
    <div className="section-card">
      <h2 className="section-title">Informações Gerais da Reunião</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="form-label">Data da Reunião<span className="required-mark">*</span></Label>
          <Input type="date" value={data.dataReuniao} onChange={e => onUpdate('dataReuniao', e.target.value)} />
        </div>
        <div>
          <Label className="form-label">Tipo de Assembleia<span className="required-mark">*</span></Label>
          <RadioGroup value={data.tipoAssembleia} onValueChange={v => onUpdate('tipoAssembleia', v as any)} className="flex gap-4 mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Ordinária" id="ordinaria" />
              <Label htmlFor="ordinaria" className="font-normal">Ordinária</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Extraordinária" id="extraordinaria" />
              <Label htmlFor="extraordinaria" className="font-normal">Extraordinária</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label className="form-label">Hora de Início<span className="required-mark">*</span></Label>
          <div className="flex gap-2">
            <Input type="time" value={data.horaInicio} onChange={e => onUpdate('horaInicio', e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={() => onUpdate('horaInicio', now())}>
              <Clock className="w-3 h-3 mr-1" /> Agora
            </Button>
          </div>
        </div>
        <div>
          <Label className="form-label">Hora de Término<span className="required-mark">*</span></Label>
          <div className="flex gap-2">
            <Input type="time" value={data.horaTermino} onChange={e => onUpdate('horaTermino', e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={() => onUpdate('horaTermino', now())}>
              <Clock className="w-3 h-3 mr-1" /> Agora
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Checkbox checked={data.semQuorum} onCheckedChange={v => onUpdate('semQuorum', !!v)} id="semQuorum" />
        <Label htmlFor="semQuorum" className="font-normal">Não houve quórum na 1ª chamada</Label>
      </div>

      {data.semQuorum && (
        <div className="mt-3">
          <Label className="form-label">Hora da 2ª Chamada</Label>
          <Input type="time" value={data.horaSegundaChamada} onChange={e => onUpdate('horaSegundaChamada', e.target.value)} />
        </div>
      )}

      <div className="mt-4 space-y-4">
        {[
          { label: 'Pastor Dirigente', field: 'pastorDirigente' as const, placeholder: 'Nome completo do Pastor Dirigente' },
          { label: 'Local da Reunião', field: 'localReuniao' as const, placeholder: 'Local da reunião' },
          { label: 'Assuntos Principais', field: 'assuntosPrincipais' as const, placeholder: 'Ex: situação financeira, recepção de novos membros' },
        ].map(item => (
          <div key={item.field}>
            <Label className="form-label">{item.label}</Label>
            <div className="flex gap-2">
              <Input value={data[item.field] as string} onChange={e => onUpdate(item.field, e.target.value)} placeholder={item.placeholder} />
              <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault(item.field, data[item.field] as string)} title="Salvar como padrão">
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <div>
          <Label className="form-label">Palavra Inicial (Ex: Salmo 133)</Label>
          <Input value={data.palavraInicial} onChange={e => onUpdate('palavraInicial', e.target.value)} placeholder="Ex: Salmo 133" />
        </div>
        <div>
          <Label className="form-label">Hino da Harpa Cristã</Label>
          <Input value={data.hinoHarpa} onChange={e => onUpdate('hinoHarpa', e.target.value)} placeholder="Ex: H.C. 15" />
        </div>
      </div>

      <div className="mt-4">
        <Label className="form-label">Aprovação da Ata Anterior</Label>
        <RadioGroup value={data.aprovacaoAtaAnterior} onValueChange={v => onUpdate('aprovacaoAtaAnterior', v as any)} className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unanimidade" id="unanimidade" />
            <Label htmlFor="unanimidade" className="font-normal">Aprovada por unanimidade</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="ressalvas" id="ressalvas" />
            <Label htmlFor="ressalvas" className="font-normal">Aprovada com ressalvas / Não aprovada</Label>
          </div>
        </RadioGroup>
      </div>

      {data.aprovacaoAtaAnterior === 'ressalvas' && (
        <div className="mt-3 p-4 rounded-lg border border-warning/30 bg-warning/5 space-y-3">
          <div>
            <Label className="form-label">Nome do Membro com Ressalva</Label>
            <Input value={data.ressalvaMembro} onChange={e => onUpdate('ressalvaMembro', e.target.value)} />
          </div>
          <div>
            <Label className="form-label">Motivos da Ressalva</Label>
            <Textarea value={data.ressalvaMotivos} onChange={e => onUpdate('ressalvaMotivos', e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="form-label">Esclarecimentos Prestados</Label>
            <Textarea value={data.ressalvaEsclarecimentos} onChange={e => onUpdate('ressalvaEsclarecimentos', e.target.value)} rows={2} />
          </div>
          <RadioGroup value={data.ressalvaPosicaoFinal} onValueChange={v => onUpdate('ressalvaPosicaoFinal', v as any)} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="manteve" id="manteve" />
              <Label htmlFor="manteve" className="font-normal">Manteve a posição</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="retirou" id="retirou" />
              <Label htmlFor="retirou" className="font-normal">Retirou a ressalva após esclarecimentos</Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
