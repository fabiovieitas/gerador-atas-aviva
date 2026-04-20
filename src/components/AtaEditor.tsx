import { Button } from "@/components/ui/button";
import { Copy, Download, Pencil, Eye, RotateCcw, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignJustify, Minus, Plus, Undo2, Redo2, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import html2pdf from 'html2pdf.js';
import { supabase } from '@/integrations/supabase/client';


interface SignatureData {
  secretarioNome: string;
  secretarioCargo: string;
  presidenteNome: string;
  presidenteCargo: string;
}

interface Props {
  ataTexto: string;
  onUpdate: (texto: string) => void;
  originalTexto?: string;
  signatureData?: SignatureData;
}

export function AtaEditor({ ataTexto, onUpdate, originalTexto, signatureData }: Props) {
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);
  const [houveEdicao, setHouveEdicao] = useState(false);

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
      setHouveEdicao(true);
    }
  }, [onUpdate]);

  const possuiAlteracoesNaoSalvas = editing && houveEdicao && !!ataTexto;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!possuiAlteracoesNaoSalvas) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [possuiAlteracoesNaoSalvas]);

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
    const sec = signatureData;
    const secNome = sec?.secretarioNome || '___';
    const secCargo = sec?.secretarioCargo || 'Secretário(a)';
    const presNome = sec?.presidenteNome || '___';
    const presCargo = sec?.presidenteCargo || '1º Dirigente e Pastor';
    
    return `
      <table class="sig-table" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td class="sig-line">_________________________</td>
          <td class="sig-line">_________________________</td>
        </tr>
        <tr>
          <td class="sig-info">${secNome}<br/>${secCargo}</td>
          <td class="sig-info">${presNome}<br/>${presCargo}</td>
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
    margin-left: 5cm;
    margin-top: 0;
    margin-bottom: 9pt;
  }
  .sig-table {
    margin-top: 24pt;
    border-collapse: collapse;
  }
  .sig-line {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    padding: 0 20pt;
    width: 50%;
  }
  .sig-info {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    padding: 0 20pt;
    width: 50%;
    line-height: 1.3;
  }
</style>
</head>
<body>${content}</body>
</html>`;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getNomeArquivoWord();
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo Word baixado!");
    setHouveEdicao(false);
  };

  const baixarPDF = () => {
    const content = buildWordHtml();
    
    const div = document.createElement('div');
    div.innerHTML = content;
    
    div.style.padding = '10px 20px';
    div.style.fontFamily = "'Times New Roman', Times, serif";
    div.style.fontSize = '12pt';
    div.style.lineHeight = '1.5';
    div.style.color = '#000';
    div.style.textAlign = 'justify';
    
    const titulos = div.querySelectorAll('.titulo');
    titulos.forEach(t => {
      (t as HTMLElement).style.fontWeight = 'bold';
      (t as HTMLElement).style.textAlign = 'center';
      (t as HTMLElement).style.marginBottom = '20px';
    });

    const assinaturas = div.querySelectorAll('.assinaturas');
    assinaturas.forEach(a => {
      (a as HTMLElement).style.marginTop = '60px';
    });
    
    const opt = {
      margin:       [20, 15, 20, 15],
      filename:     getNomeArquivoWord().replace('.doc', '.pdf'),
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    toast.info("Gerando PDF, aguarde...");
    html2pdf().from(div).set(opt).outputPdf('blob').then(async (pdfBlob: Blob) => {
      // Baixar localmente
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opt.filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("PDF baixado localmente!");
      setHouveEdicao(false);

      // Salvar na Nuvem (Supabase)
      try {
        const filePath = `${Date.now()}_${opt.filename}`;
        toast.info("Salvando cópia na nuvem...");
        const { error } = await supabase.storage.from('atas_pdfs').upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
        
        if (error) {
          console.error("Supabase Upload Error:", error);
          toast.warning("Ata baixada, mas não salva na nuvem. Verifique o banco de dados.");
        } else {
          toast.success("Cópia salva com sucesso no Supabase Storage!");
        }
      } catch (err) {
        console.error(err);
      }
    }).catch((err: any) => {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    });
  };

  const capitalize = (txt: string) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();

  const getNomeArquivoWord = () => {
    const raw = editing && editorRef.current ? editorRef.current.innerText : ataTexto;
    const tituloMatch = raw.match(/ATA DE ASSEMBLEIA\s+([A-ZÀ-Ú]+)/i);
    const tipo = tituloMatch?.[1] ? capitalize(tituloMatch[1]) : "Ordinária";

    const dataMatch = raw.match(/Aos\s+(\d{2})\s+de\s+([a-zà-úç]+)\s+de\s+(\d{4})/i);
    if (dataMatch) {
      const dia = dataMatch[1];
      const mes = capitalize(dataMatch[2]);
      const ano = dataMatch[3];
      return `${dia} - Ata ${tipo} ${mes} de ${ano}.doc`;
    }

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });
    const ano = String(hoje.getFullYear());
    return `${dia} - Ata ${tipo} ${capitalize(mes)} de ${ano}.doc`;
  };

  const restaurar = () => {
    if (originalTexto) {
      onUpdate(originalTexto);
      if (editorRef.current) {
        editorRef.current.innerText = originalTexto;
      }
      toast.info("Texto restaurado ao original.");
      setHouveEdicao(false);
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
              onClick={() => {
                if (editing && possuiAlteracoesNaoSalvas) {
                  const confirmar = window.confirm("Você fez alterações e pode perder o que editou. Deseja continuar?");
                  if (!confirmar) return;
                }
                setEditing(!editing);
              }}
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
              <FileText className="w-3.5 h-3.5" /> Word
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={baixarPDF} className="gap-1 border-primary/30 text-primary hover:bg-primary/10">
              <FileDown className="w-3.5 h-3.5" /> PDF
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

      {possuiAlteracoesNaoSalvas && (
        <p className="text-xs text-warning mb-2">
          Atenção: você está editando e tem alterações que ainda não foram exportadas.
        </p>
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
                  <div key={i} className="mt-6 flex justify-around">
                    <div className="text-center">
                      <div className="border-t border-black w-48"></div>
                      <div className="text-sm leading-tight">Secretário(a)</div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-black w-48"></div>
                      <div className="text-sm leading-tight">Presidente</div>
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
