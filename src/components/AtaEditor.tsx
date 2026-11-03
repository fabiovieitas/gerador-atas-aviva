import { Button } from "@/components/ui/button";
import { Copy, Download, Pencil, Eye, RotateCcw, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignJustify, Minus, Plus, Undo2, Redo2, FileText, FileDown, Scale, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import html2pdf from 'html2pdf.js';
import { exportarParaDocx } from '@/lib/docxExport';
import { supabase } from '@/integrations/supabase/client';
import { EstatutoSearchModal } from "./EstatutoSearchModal";
import { getGroqApiKey } from "@/lib/aiConfig";


interface SignatureData {
  secretarioNome: string;
  secretarioCargo: string;
  presidenteNome: string;
  presidenteCargo: string;
}

interface ChurchInfo {
  nome: string;
  cnpj: string;
  endereco: string;
  logo_url: string;
  estatuto_texto?: string;
  regimento_texto?: string;
  gemini_api_key?: string;
}

interface Props {
  ataTexto: string;
  onUpdate: (texto: string) => void;
  originalTexto?: string;
  signatureData?: SignatureData;
  churchInfo?: ChurchInfo | null;
}

export function AtaEditor({ ataTexto, onUpdate, originalTexto, signatureData, churchInfo }: Props) {
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(13);
  const [houveEdicao, setHouveEdicao] = useState(false);
  const [isEstatutoModalOpen, setIsEstatutoModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
    const raw = editing && editorRef.current ? editorRef.current.innerText : ataTexto;
    
    const lines = raw.split('\n');
    const htmlParts: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Title line (ATA DE ASSEMBLEIA...)
      if (line.trim().startsWith('ATA DE ASSEMBLEIA') || line.trim().startsWith('ATA DA ASSEMBLEIA')) {
        htmlParts.push(`<p class="titulo">${line.trim()}</p>`);
        continue;
      }
      
      // Signature placeholder
      if (line.trim() === '{{ASSINATURAS}}' && signatureData) {
        htmlParts.push(`
          <div class="assinaturas">
            <div class="assinatura-box">
              <div class="linha"></div>
              <p><strong>${signatureData.presidenteNome}</strong></p>
              <p>${signatureData.presidenteCargo}</p>
            </div>
            <div class="assinatura-box">
              <div class="linha"></div>
              <p><strong>${signatureData.secretarioNome}</strong></p>
              <p>${signatureData.secretarioCargo}</p>
            </div>
          </div>
        `);
        continue;
      }
      
      // Empty lines
      if (!line.trim()) {
        htmlParts.push('<br/>');
        continue;
      }
      
      // Regular paragraphs
      htmlParts.push(`<p>${line}</p>`);
    }
    
    return htmlParts.join('');
  };

  const baixarWord = async () => {
    try {
      toast.info("Gerando documento Word (.docx)...");
      const raw = editing && editorRef.current ? editorRef.current.innerText : ataTexto;
      const blob = await exportarParaDocx("Ata de Assembleia", raw, signatureData, churchInfo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getNomeArquivoWord().replace(/\.doc$/i, '.docx');
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Ata baixada com sucesso no formato Word (.docx)!");
      setHouveEdicao(false);
    } catch (err: any) {
      console.error("Erro ao gerar docx:", err);
      toast.error("Falha ao gerar arquivo .docx");
    }
  };

  const baixarPDF = () => {
    const content = document.createElement('div');
    content.style.padding = '20mm';
    content.style.fontFamily = "'Calibri', 'Arial', sans-serif";
    content.style.fontSize = `${fontSize}pt`;
    content.style.textAlign = 'justify';
    content.style.lineHeight = '1.5';
    content.style.color = 'black';
    content.innerHTML = buildWordHtml();

    // Estilo específico para PDF (remover indents em títulos e assinaturas)
    const style = document.createElement('style');
    style.innerHTML = `
      p { margin: 0; text-indent: 1.5cm; }
      .titulo { text-align: center; font-weight: bold; text-decoration: underline; text-indent: 0; margin-bottom: 20px; }
      .assinaturas { margin-top: 50px; display: flex; justify-content: space-between; }
      .assinatura-box { text-align: center; width: 45%; }
      .linha { border-top: 1px solid black; margin-bottom: 5px; }
      .assinatura-box p { text-indent: 0; margin: 0; font-size: 11pt; }
    `;
    content.appendChild(style);

    const opt = {
      margin: 0,
      filename: getNomeArquivoWord().replace(/\.docx?$/i, '.pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(content).set(opt).toPdf().get('pdf').save().then(async (pdf: any) => {
      // PDF gerado com sucesso
      const pdfBlob = pdf.output('blob');
      
      // Link para download manual caso o save() falhe em algum navegador
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
      return `${dia} - Ata ${tipo} ${mes} de ${ano}.docx`;
    }

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });
    const ano = String(hoje.getFullYear());
    return `${dia} - Ata ${tipo} ${capitalize(mes)} de ${ano}.docx`;
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

  const handleAISuggest = async () => {
    const selection = window.getSelection()?.toString();
    const textoParaMelhorar = selection || ataTexto;

    if (!textoParaMelhorar || textoParaMelhorar.length < 10) {
      toast.error("Escreva ou selecione alguns tópicos para a IA formatar.");
      return;
    }

    setIsAiLoading(true);
    toast.info("Redigindo com IA Jurídica...");

    const promptSistema = `Você é um secretário executivo eclesiástico e jurídico de alta precisão da Igreja Evangélica AVIVA.
Sua missão é redigir ou aprimorar o texto de uma ata de assembleia com base nas informações/tópicos fornecidos.
Diretrizes:
- Use terminologia formal canônica (ex: 'submeteu-se à apreciação soberana da assembleia', 'aprovado por unanimidade dos membros presentes', 'lavrou-se a presente ata').
- Mantenha rigorosamente todos os nomes de membros, datas, cargos e valores monetários informados.
- Retorne APENAS o texto corrido e formal para inserção direta na ata, sem introduções, cumprimentos ou explicações.`;

    try {
      let aiText = "";
      const freeLlmUrl = import.meta.env.VITE_FREELLMAPI_URL || "http://127.0.0.1:3001/v1";
      const freeLlmKey = import.meta.env.VITE_FREELLMAPI_KEY || "freellmapi-0af93b3a0e1cbe45a5785fd84071080555fc11b147d6f7f2";

      // 1. Tenta via FreeLLMAPI (R$ 0 - Claude 3.5 Sonnet / Qwen / Auto)
      try {
        const resFree = await fetch(`${freeLlmUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${freeLlmKey}`
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            messages: [
              { role: "system", content: promptSistema },
              { role: "user", content: `Estruture formalmente para a ata os seguintes tópicos:\n\n${textoParaMelhorar}` }
            ],
            temperature: 0.2
          })
        });

        if (resFree.ok) {
          const dataFree = await resFree.json();
          aiText = dataFree.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (errFree) {
        console.warn("FreeLLMAPI indisponível, verificando fallback:", errFree);
      }

      // 2. Fallback Groq (HTTPS nativo direto na nuvem)
      if (!aiText) {
        try {
          const groqKey = getGroqApiKey();
          const resGroq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: "qwen/qwen3.8-27b",
              messages: [
                { role: "system", content: promptSistema },
                { role: "user", content: `Estruture formalmente para a ata os seguintes tópicos:\n\n${textoParaMelhorar}` },
              ],
              temperature: 0.2,
            }),
          });
          if (resGroq.ok) {
            const dataGroq = await resGroq.json();
            aiText = dataGroq.choices?.[0]?.message?.content?.trim() || "";
          }
        } catch (errGroq) {
          console.warn("Groq fallback acionado no editor:", errGroq);
        }
      }

      // 3. Fallback caso exista chave do Gemini configurada na igreja
      if (!aiText && churchInfo?.gemini_api_key) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${churchInfo.gemini_api_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${promptSistema}\n\nTópicos:\n"${textoParaMelhorar}"`
              }]
            }]
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Erro no Google Gemini");
        aiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      }

      if (!aiText) {
        throw new Error("Não foi possível conectar ao FreeLLMAPI nem ao Gemini de contingência.");
      }

      if (selection) {
        execCmd('insertText', aiText);
      } else {
        const novoTexto = ataTexto + "\n\n" + aiText;
        onUpdate(novoTexto);
        if (editorRef.current) {
          editorRef.current.innerText = novoTexto;
        }
      }
      toast.success("Texto formatado pela IA com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro: ${err.message || "Falha na conexão com a IA"}`);
    } finally {
      setIsAiLoading(false);
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

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton 
              icon={Scale} 
              label="Citar Estatuto Digital" 
              onClick={() => setIsEstatutoModalOpen(true)} 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAISuggest}
              disabled={isAiLoading}
              className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8 px-2"
            >
              {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span className="text-[10px] font-bold uppercase tracking-tight">Redigir com IA</span>
            </Button>
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
        <div className="ata-preview overflow-y-auto max-h-[600px] p-8 bg-white shadow-inner rounded-lg border text-black">
          {ataTexto ? (
            <div 
              style={{ 
                fontFamily: "'Calibri', 'Arial', sans-serif", 
                fontSize: `${fontSize}pt`, 
                textAlign: 'justify', 
                color: 'black' 
              }}
              dangerouslySetInnerHTML={{ __html: buildWordHtml() }}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground italic">
                Preencha os campos e clique em <span className="font-bold text-primary">"Gerar Ata"</span> para ver a pré-visualização aqui.
              </p>
            </div>
          )}
        </div>
      )}

      <EstatutoSearchModal
        isOpen={isEstatutoModalOpen}
        onClose={() => setIsEstatutoModalOpen(false)}
        estatutoTexto={churchInfo?.estatuto_texto}
        regimentoTexto={churchInfo?.regimento_texto}
        onSelect={(text) => execCmd('insertText', ` ${text} `)}
      />
    </div>
  );
}
