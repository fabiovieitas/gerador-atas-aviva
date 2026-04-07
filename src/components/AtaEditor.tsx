import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Pencil, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  ataTexto: string;
  onUpdate: (texto: string) => void;
  originalTexto?: string;
}

export function AtaEditor({ ataTexto, onUpdate, originalTexto }: Props) {
  const [editing, setEditing] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(ataTexto);
    toast.success("Ata copiada!");
  };

  const baixarWord = () => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:1in;}body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.8;text-align:justify;color:#000;white-space:pre-wrap;word-wrap:break-word;margin:0;padding:0;}</style></head><body>${ataTexto}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ata_aviva.doc';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo Word baixado!");
  };

  const restaurar = () => {
    if (originalTexto) {
      onUpdate(originalTexto);
      toast.info("Texto restaurado ao original.");
    }
  };

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-title mb-0 pb-0 border-b-0 flex items-center gap-2">
          {editing ? <Pencil className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {editing ? 'Editor da Ata' : 'Pré-visualização da Ata'}
        </h2>
        {ataTexto && (
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant={editing ? "default" : "secondary"}
              size="sm"
              onClick={() => setEditing(!editing)}
              className="gap-1"
            >
              {editing ? <><Eye className="w-3.5 h-3.5" /> Visualizar</> : <><Pencil className="w-3.5 h-3.5" /> Editar</>}
            </Button>
            {editing && originalTexto && (
              <Button type="button" variant="outline" size="sm" onClick={restaurar} className="gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={copiar} className="gap-1">
              <Copy className="w-3.5 h-3.5" /> Copiar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={baixarWord} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Word
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Textarea
          value={ataTexto}
          onChange={e => onUpdate(e.target.value)}
          className="min-h-[400px] font-serif text-sm leading-relaxed"
          style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: '1.8' }}
        />
      ) : (
        <div className="ata-preview">
          {ataTexto || (
            <span className="text-muted-foreground italic">
              Preencha os campos e clique em "Gerar Ata" para ver a pré-visualização aqui.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
