import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, Clock, Image as ImageIcon, Upload, X, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MemberMentionInput } from "@/components/MemberMentionInput";
import type { AtaFormData, Membro } from "@/types/ata";

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onSaveDefault: (key: string, value: string) => void;
  membros: Membro[];
}

export function MeetingInfoSection({ data, onUpdate, onSaveDefault, membros }: Props) {
  const [uploading, setUploading] = useState(false);
  const now = () => new Date().toTimeString().slice(0, 5);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [...(data.fotosAssinaturaUrls || [])];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `assinaturas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assinaturas_atas')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assinaturas_atas')
          .getPublicUrl(filePath);
        
        newUrls.push(publicUrl);
      }

      onUpdate('fotosAssinaturaUrls', newUrls);
      toast.success(`${files.length} foto(s) enviada(s) com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (urlToRemove: string) => {
    const filtered = (data.fotosAssinaturaUrls || []).filter(url => url !== urlToRemove);
    onUpdate('fotosAssinaturaUrls', filtered);
  };

  return (
    <div className="section-card space-y-6">
      {/* Área de Upload com Destaque */}
      <div className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center text-center space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary flex items-center justify-center gap-2">
            <ImageIcon className="w-5 h-5" /> Folhas de Assinaturas
          </h3>
          <p className="text-sm text-muted-foreground">Você pode subir várias fotos se a lista for grande</p>
        </div>
        
        {/* Galeria de Fotos */}
        {data.fotosAssinaturaUrls && data.fotosAssinaturaUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
            {data.fotosAssinaturaUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-background group shadow-sm">
                <img src={url} alt={`Folha ${index + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="icon" variant="destructive" onClick={() => removePhoto(url)} className="w-8 h-8 rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute top-1 right-1 bg-primary/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="w-full h-24 flex flex-col items-center justify-center space-y-2 hover:bg-primary/10 transition-colors cursor-pointer relative rounded-lg border-2 border-primary/20 bg-background group">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileUpload} 
              disabled={uploading} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              {uploading ? <Upload className="w-5 h-5 text-primary animate-bounce" /> : <Upload className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {uploading ? 'Enviando...' : 'Adicionar Assinaturas'}
              </p>
              <p className="text-[10px] text-muted-foreground">Clique para selecionar uma ou mais fotos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="section-title">Informações Gerais da Reunião</h2>
        <div className="grid sm:grid-cols-2 gap-4">
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

        <div className="grid sm:grid-cols-2 gap-4">
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
        <div>
          <Label className="form-label">Pastor Dirigente</Label>
          <div className="flex gap-2">
            <MemberMentionInput value={data.pastorDirigente} onChange={v => onUpdate('pastorDirigente', v)} membros={membros} placeholder="Digite @ para buscar membros" nameOnly />
            <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('pastorDirigente', data.pastorDirigente)} title="Salvar como padrão">
              <Save className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="form-label">Local da Reunião</Label>
          <div className="flex gap-2">
            <Input value={data.localReuniao} onChange={e => onUpdate('localReuniao', e.target.value)} placeholder="Local da reunião" />
            <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('localReuniao', data.localReuniao)} title="Salvar como padrão">
              <Save className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="form-label">Assuntos Principais</Label>
          <div className="flex gap-2">
            <Input value={data.assuntosPrincipais} onChange={e => onUpdate('assuntosPrincipais', e.target.value)} placeholder="Ex: situação financeira, recepção de novos membros" />
            <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('assuntosPrincipais', data.assuntosPrincipais)} title="Salvar como padrão">
              <Save className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

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
            <MemberMentionInput value={data.ressalvaMembro} onChange={v => onUpdate('ressalvaMembro', v)} membros={membros} placeholder="Digite @ para buscar membros" />
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
