import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { AtaFormData } from "@/types/ata";

interface Props {
  data: AtaFormData;
  onUpdate: <K extends keyof AtaFormData>(field: K, value: AtaFormData[K]) => void;
  onSaveDefault: (key: string, value: string) => void;
}

export function SecretarySection({ data, onUpdate, onSaveDefault }: Props) {
  return (
    <div className="section-card">
      <h2 className="section-title">Redator(a) da Ata</h2>
      <Label className="form-label">Nome do Redator(a)</Label>
      <div className="flex gap-2">
        <Input value={data.nomeSecretario} onChange={e => onUpdate('nomeSecretario', e.target.value)} placeholder="Nome completo" />
        <Button type="button" variant="outline" size="icon" onClick={() => onSaveDefault('nomeSecretario', data.nomeSecretario)}>
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
