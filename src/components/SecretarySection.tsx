import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { MemberMentionInput } from "@/components/MemberMentionInput";
import type { AtaFormData, Membro } from "@/types/ata";

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onSaveDefault: (key: string, value: string) => void;
  membros: Membro[];
}

export function SecretarySection({ data, onUpdate, onSaveDefault, membros }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Redator(a) da Ata</h2>
      <Label className="form-label">Nome do Redator(a)</Label>
      <div className="flex gap-2">
        <MemberMentionInput value={data.nomeSecretario} onChange={v => onUpdate('nomeSecretario', v)} membros={membros} placeholder="Digite @ para buscar membros" nameOnly />
        <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('nomeSecretario', data.nomeSecretario)}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
