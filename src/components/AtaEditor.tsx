import { Button } from "@/components/ui/button";
import { Copy, Download, Pencil, Eye, RotateCcw, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignJustify, Minus, Plus, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  ataTexto: string;
  onUpdate: (texto: string) => void;
  originalTexto?: string;
}

export function AtaEditor({ ataTexto, onUpdate, originalTexto }: Props) {
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);

  // Sync content into the contentEditable div when switching to edit mode or when ataTexto changes externally
  useEffect(() => {
    if (editing && editorRef.current) {
      // Only set if content differs (avoid cursor reset)
      const currentText = editorRef.current.innerText;
      if (currentText !== ataTexto) {
        editorRef.current.innerText = ataTexto;
      }
    }
  }, [editing, ataTexto]);

  const execCmd = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      // Get the HTML content for rich formatting
      onUpdate(editorRef.current.innerText);
    }
  }, [onUpdate]);

  const copiar = () => {
    navigator.clipboard.writeText(ataTexto);
    toast.success("Ata copiada!");
  };

  const buildWordHtml = () => {
    let raw = editing && editorRef.current ? editorRef.current.innerText : ataTexto;
    
    const lines = raw.split('\n');
    let htmlParts: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Title line (ATA DE ASSEMBLEIA...)
      if (line.trim().startsWith('ATA DE ASSEMBLEIA') || line.trim().startsWith('ATA DA ASSEMBLEIA')) {
        htmlParts.push(`<p class="titulo">${line.trim()}</p>`);
        continue;
      }
      
      // Signature placeholder
      if (line.trim() === '{{ASSINATURAS}}') {
        continue;
      }
      
      // Empty lines
      if (!line.trim()) {
        continue;
      }
      
      // Regular paragraph (all text is continuous, no section headers)
      htmlParts.push(`<p>${line.trim()}</p>`);
    }
    
    // Add signature block
    if (raw.includes('{{ASSINATURAS}}')) {
      htmlParts.push(`<div class="assinaturas">` + getSignatureHtml() + `</div>`);
    }
    
    return htmlParts.join('\n');
  };

  const getSignatureHtml = () => {
    const raw = editing && editorRef.current ? editorRef.current.innerText : ataTexto;
    const match = raw.match(/eu, (.+?), na qualidade/);
    const matchPres = raw.match(/direção d[oa] (.+?) (.+?),/);
    
    const secretario = match ? match[1] : '___';
    const cargoSec = 'Secretário(a)';
    
    // Try to get pastor name and title
    let presidente = '___';
    let cargoPres = '1º dirigente e Pastor';
    if (matchPres) {
      const cargoP = matchPres[1];
      const nomeP = matchPres[2];
      presidente = nomeP;
      cargoPres = cargoP;
    }
    
    return `
      <table class="sig-table" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td class="sig-cell">_________________________</td>
          <td class="sig-cell">_________________________</td>
        </tr>
        <tr>
          <td class="sig-name">${secretario}</td>
          <td class="sig-name">${presidente}</td>
        </tr>
        <tr>
          <td class="sig-cargo">${cargoSec}</td>
          <td class="sig-cargo">${cargoPres}</td>
        </tr>
      </table>`;
  };

  const baixarWord = () => {
    const content = buildWordHtml();
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: A4;
    margin-top: 1cm;
    margin-bottom: 1.5cm;
    margin-left: 3cm;
    margin-right: 3cm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    text-align: justify;
    color: #000;
    margin: 0;
    padding: 0;
  }
  p {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    text-align: justify;
    margin-top: 0;
    margin-bottom: 9pt;
    line-height: 1.5;
  }
  p.titulo {
    font-weight: bold;
    text-indent: 5cm;
    margin-top: 0;
    margin-bottom: 9pt;
  }
  p.subtitulo {
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 9pt;
  }
  .sig-table {
    margin-top: 40pt;
    border-collapse: collapse;
  }
  .sig-cell {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    padding: 0 20pt;
    width: 50%;
  }
  .sig-name {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    padding: 2pt 20pt 0;
    width: 50%;
  }
  .sig-cargo {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    padding: 0 20pt;
    width: 50%;
  }
</style>
</head>
<body>${content}</body>
</html>`;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
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
      if (editorRef.current) {
        editorRef.current.innerText = originalTexto;
      }
      toast.info("Texto restaurado ao original.");
    }
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(8, Math.min(24, fontSize + delta));
    setFontSize(newSize);
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${newSize}pt`;
    }
  };

  const ToolbarButton = ({ icon: Icon, label, onClick, className = "" }: { icon: any; label: string; onClick: () => void; className?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClick(); }}
          className={`p-1.5 rounded hover:bg-muted text-foreground/70 hover:text-foreground transition-colors ${className}`}
        >
          <Icon className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

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

      {/* Toolbar - visible only in edit mode */}
      {editing && ataTexto && (
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-0.5 p-2 mb-3 rounded-lg border bg-muted/30 flex-wrap">
            <ToolbarButton icon={Bold} label="Negrito (Ctrl+B)" onClick={() => execCmd('bold')} />
            <ToolbarButton icon={Italic} label="Itálico (Ctrl+I)" onClick={() => execCmd('italic')} />
            <ToolbarButton icon={UnderlineIcon} label="Sublinhado (Ctrl+U)" onClick={() => execCmd('underline')} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={AlignLeft} label="Alinhar à esquerda" onClick={() => execCmd('justifyLeft')} />
            <ToolbarButton icon={AlignCenter} label="Centralizar" onClick={() => execCmd('justifyCenter')} />
            <ToolbarButton icon={AlignJustify} label="Justificar" onClick={() => execCmd('justifyFull')} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={Minus} label="Diminuir fonte" onClick={() => changeFontSize(-1)} />
            <span className="text-xs font-medium text-muted-foreground min-w-[3ch] text-center">{fontSize}</span>
            <ToolbarButton icon={Plus} label="Aumentar fonte" onClick={() => changeFontSize(1)} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={() => execCmd('undo')} />
            <ToolbarButton icon={Redo2} label="Refazer (Ctrl+Y)" onClick={() => execCmd('redo')} />
          </div>
        </TooltipProvider>
      )}

      {editing ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="ata-preview outline-none focus:ring-2 focus:ring-primary/20 cursor-text"
          style={{ fontSize: `${fontSize}pt` }}
          suppressContentEditableWarning
        />
      ) : (
        <div className="ata-preview">
          {ataTexto ? (
            ataTexto.split('\n').map((line, i) => {
              if (line.trim() === '{{ASSINATURAS}}') {
                return (
                  <div key={i} className="mt-10 flex justify-around">
                    <div className="text-center">
                      <div className="border-t border-black w-48 mb-1"></div>
                      <div>Secretário(a)</div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-black w-48 mb-1"></div>
                      <div>Presidente</div>
                    </div>
                  </div>
                );
              }
              return <span key={i}>{line}{'\n'}</span>;
            })
          ) : (
            <span className="text-muted-foreground italic">
              Preencha os campos e clique em "Gerar Ata" para ver a pré-visualização aqui.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
