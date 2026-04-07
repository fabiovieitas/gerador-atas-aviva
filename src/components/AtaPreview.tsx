import { Button } from "@/components/ui/button";
import { Copy, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface Props {
  ataTexto: string;
}

export function AtaPreview({ ataTexto }: Props) {
  const copiar = () => {
    navigator.clipboard.writeText(ataTexto);
    toast.success("Ata copiada para a área de transferência!");
  };

  const baixarWord = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 1in; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.8;
    text-align: justify;
    color: #000;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    padding: 0;
  }
</style>
</head>
<body>${ataTexto}</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ata_aviva.doc';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo Word baixado!");
  };

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0 pb-0 border-b-0">Pré-visualização da Ata</h2>
        {ataTexto && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copiar}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={baixarWord}>
              <Download className="w-3.5 h-3.5 mr-1" /> Word
            </Button>
          </div>
        )}
      </div>
      <div className="ata-preview">
        {ataTexto || (
          <span className="text-muted-foreground italic">
            A pré-visualização da ata aparecerá aqui após gerar.
          </span>
        )}
      </div>
    </div>
  );
}
