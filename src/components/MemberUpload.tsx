import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Membro } from "@/types/ata";

interface Props {
  onImport: (membros: Membro[]) => void;
  existingMembros: Membro[];
}

export function MemberUpload({ onImport, existingMembros }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Membro[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const parseCSV = (text: string): Membro[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const membros: Membro[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header-like lines
      if (i === 0 && /nome/i.test(line)) continue;

      const parts = line.split(/[;,\t]/).map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 1 && parts[0]) {
        const nome = parts[0];
        const cargo = parts[1] || '';
        const generoRaw = (parts[2] || '').toLowerCase();
        const genero: 'masculino' | 'feminino' =
          generoRaw.startsWith('f') ? 'feminino' : 'masculino';

        if (!existingMembros.some(m => m.nome === nome)) {
          membros.push({ nome, cargo, genero });
        }
      }
    }
    return membros;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("Nenhum novo membro encontrado no arquivo.");
        return;
      }
      setPreview(parsed);
      setShowPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmarImport = () => {
    onImport(preview);
    toast.success(`${preview.length} membro(s) importado(s)!`);
    setShowPreview(false);
    setPreview([]);
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />

      <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
        <Upload className="w-4 h-4" /> Importar Lista
      </Button>

      {showPreview && preview.length > 0 && (
        <div className="mt-4 p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            {preview.length} novo(s) membro(s) encontrado(s)
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Membros já cadastrados foram ignorados
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {preview.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="font-medium">{m.nome}</span>
                {m.cargo && <span className="text-muted-foreground">• {m.cargo}</span>}
                <span className="text-muted-foreground text-xs">({m.genero === 'feminino' ? 'F' : 'M'})</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmarImport}>Confirmar Importação</Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowPreview(false); setPreview([]); }}>Cancelar</Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Formato: CSV ou TXT com colunas <strong>Nome, Cargo, Gênero</strong> (separados por vírgula, ponto-e-vírgula ou tab)
      </p>
    </div>
  );
}
