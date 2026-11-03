import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, Clock, Image as ImageIcon, Upload, X, CheckCircle2, AlertCircle, Tag, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MemberMentionInput } from "@/components/MemberMentionInput";
import type { AtaFormData, Membro } from "@/types/ata";

// Utilitário para garantir que valores vindos do Postgres como array de texto sejam sempre tratados como array de strings,
// evitando quebras de tipos se vier formato raw de string (ex: "{}")
export const safeParseArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val.startsWith('{') && val.endsWith('}')) {
      const content = val.slice(1, -1).trim();
      if (!content) return [];
      return content.split(',').map(item => {
        let clean = item.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.slice(1, -1);
        }
        return clean;
      });
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
};

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onSaveDefault: (key: string, value: string) => void;
  membros: Membro[];
  membrosPresentes?: string[];
}

export function MeetingInfoSection({ data, onUpdate, onSaveDefault, membros, membrosPresentes = [] }: Props) {
  const [uploading, setUploading] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const PRESET_TAGS = ["Desligamento", "Financeiro", "Retiro", "Reforma", "Batismo", "Eleição", "Patrimônio", "Conselho Fiscal", "Disciplina", "Missões", "Evangelismo", "Pastoral"];

  const currentTags = safeParseArray(data.tags);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, "");
    if (!clean) return;
    if (currentTags.map((t) => t.toLowerCase()).includes(clean.toLowerCase())) {
      toast.info(`Tag #${clean} já adicionada.`);
      setNewTagInput("");
      return;
    }
    onUpdate("tags", [...currentTags, clean]);
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate("tags", currentTags.filter((t) => t !== tagToRemove));
  };

  const handleTogglePreset = (preset: string) => {
    if (currentTags.includes(preset)) {
      handleRemoveTag(preset);
    } else {
      handleAddTag(preset);
    }
  };

  const now = () => new Date().toTimeString().slice(0, 5);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [...safeParseArray(data.fotosAssinaturaUrls)];

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
    const filtered = safeParseArray(data.fotosAssinaturaUrls).filter(url => url !== urlToRemove);
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
        {data.fotosAssinaturaUrls && safeParseArray(data.fotosAssinaturaUrls).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
            {safeParseArray(data.fotosAssinaturaUrls).map((url, index) => (
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

      {/* Quorum Warning Section */}
      {membros.length > 0 && (
        <div className={`mt-6 p-4 rounded-xl border ${membrosPresentes.length >= Math.ceil((membros.length * 2) / 3) ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-3">
            {membrosPresentes.length >= Math.ceil((membros.length * 2) / 3) ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-3 flex-1">
              <div>
                <h4 className={`text-sm font-bold ${membrosPresentes.length >= Math.ceil((membros.length * 2) / 3) ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {membrosPresentes.length >= Math.ceil((membros.length * 2) / 3) 
                    ? "Quórum Mínimo Atingido (2/3)" 
                    : "Quórum Insuficiente na 1ª Chamada"}
                </h4>
                <p className={`text-xs mt-1 ${membrosPresentes.length >= Math.ceil((membros.length * 2) / 3) ? 'text-emerald-600' : 'text-amber-700'}`}>
                  De acordo com o Art. 53 do Estatuto, é necessário 2/3 dos membros ({Math.ceil((membros.length * 2) / 3)} de {membros.length}) para abrir a sessão. 
                  Atualmente há {membrosPresentes.length} presentes.
                </p>
              </div>

              {membrosPresentes.length < Math.ceil((membros.length * 2) / 3) && (
                <div className="bg-white/60 p-3 rounded-lg border border-amber-200/50">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={data.semQuorum} onCheckedChange={v => onUpdate('semQuorum', !!v)} id="semQuorum" className="border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white" />
                    <Label htmlFor="semQuorum" className="font-semibold text-amber-900 cursor-pointer text-sm">
                      Confirmar que não houve quórum (Abre em 2ª chamada)
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Checkbox fallback if no members registered */}
      {membros.length === 0 && (
        <div className="flex items-center gap-2 mt-4">
          <Checkbox checked={data.semQuorum} onCheckedChange={v => onUpdate('semQuorum', !!v)} id="semQuorum" />
          <Label htmlFor="semQuorum" className="font-normal">Não houve quórum na 1ª chamada</Label>
        </div>
      )}

      {data.semQuorum && (
        <div className="mt-3">
          <Label className="form-label">Hora da 2ª Chamada</Label>
          <Input type="time" value={data.horaSegundaChamada} onChange={e => onUpdate('horaSegundaChamada', e.target.value)} />
        </div>
      )}

      <div className="mt-4 space-y-4">
        {/* Dirigente da Assembleia (Regra Institucional) */}
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Dirigente da Assembleia (Regra Institucional)
            </Label>
            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              Regra Oficial Ativa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground font-medium">Título Eclesiástico</Label>
              <select
                value={data.tituloDirigente || "Presbítero"}
                onChange={(e) => onUpdate("tituloDirigente", e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Presbítero">Presbítero</option>
                <option value="Pastor">Pastor</option>
                <option value="Pastora">Pastora</option>
                <option value="Bispo">Bispo</option>
                <option value="Apóstolo">Apóstolo</option>
                <option value="Evangelista">Evangelista</option>
                <option value="Missionário">Missionário</option>
                <option value="Diácono">Diácono</option>
                <option value="Ministro">Ministro</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-[11px] text-muted-foreground font-medium">Nome do Dirigente</Label>
              <div className="flex gap-2">
                <MemberMentionInput
                  value={data.pastorDirigente}
                  onChange={(v) => onUpdate("pastorDirigente", v)}
                  membros={membros}
                  placeholder="Nome do dirigente da reunião (ex: Fábio Vieitas)"
                  nameOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onSaveDefault("tituloDirigente", data.tituloDirigente || "Presbítero");
                    onSaveDefault("pastorDirigente", data.pastorDirigente);
                    toast.success("Dirigente e título salvos como regra padrão!");
                  }}
                  title="Salvar como regra padrão institucional"
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Definido como regra oficial. Constará automaticamente na abertura, oração final e assinatura da ata.
          </p>
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

        {/* Palavras-chave / Tags da Ata */}
        <div className="sm:col-span-2 p-3.5 rounded-xl border bg-muted/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />
              Palavras-chave e Temas da Ata
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {currentTags.length} tema(s)
            </span>
          </div>

          {/* Tags ativas */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {currentTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/25 px-2.5 py-1 rounded-full shadow-xs"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 ml-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {currentTags.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                Nenhuma palavra-chave selecionada. Escolha uma sugestão rápida ou digite abaixo.
              </span>
            )}
          </div>

          {/* Campo para digitar nova tag */}
          <div className="flex gap-2">
            <Input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(newTagInput);
                }
              }}
              placeholder="Digite uma palavra-chave (ex: Desligamento, Reforma) e pressione Enter..."
              className="text-xs h-8"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddTag(newTagInput)}
              disabled={!newTagInput.trim()}
              className="text-xs h-8"
            >
              + Adicionar
            </Button>
          </div>

          {/* Sugestões Rápidas */}
          <div className="pt-2 border-t border-muted/80">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Sugestões rápidas:</span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {PRESET_TAGS.map((preset) => {
                const isSelected = currentTags.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTogglePreset(preset)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {preset}
                  </button>
                );
              })}
            </div>
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
