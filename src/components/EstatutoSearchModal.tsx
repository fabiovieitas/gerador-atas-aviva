import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Scale, FileText } from "lucide-react";

interface LegalBlock {
  text: string;
  context: string;
  fullText: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estatutoTexto: string | null | undefined;
  regimentoTexto: string | null | undefined;
  onSelect: (text: string) => void;
}

export function EstatutoSearchModal({ isOpen, onClose, estatutoTexto, regimentoTexto, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'estatuto' | 'regimento'>('estatuto');

  // Selecionar o texto ativo baseado na aba
  const activeText = activeTab === 'estatuto' ? estatutoTexto : regimentoTexto;

  // Fatiar o texto ativo em parágrafos (Artigos) de forma mais inteligente
  const articles = useMemo(() => {
    if (!activeText) return [];
    
    console.log(`Analisando ${activeTab}... Tamanho total: ${activeText.length} caracteres.`);

    const lines = activeText.split(/\n/);
    const blocks: LegalBlock[] = [];
    
    let currentChapter = "";
    let currentSection = "";
    let currentSubSection = "";
    let currentArticle = "";
    let currentBlock: { text: string; context: string } | null = null;

    const flushBlock = () => {
      if (currentBlock && currentBlock.text.trim().length > 5) {
        blocks.push({
          text: currentBlock.text.trim(),
          context: currentBlock.context,
          fullText: `Segundo o ${currentBlock.context}:\n\n${currentBlock.text.trim()}`
        });
      }
      currentBlock = null;
    };

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushBlock(); // Quebra de linha dupla encerra o bloco
        return;
      }

      // Detectar Estrutura (Títulos não entram como conteúdo de bloco por si só)
      const capMatch = trimmed.match(/^(?:CAPÍTULO|Capítulo)\s+([IVXLCDM\d\.\-]+)/i);
      const secMatch = trimmed.match(/^(?:SEÇÃO|Seção)\s+([IVXLCDM\d\.\-]+)/i);
      const subMatch = trimmed.match(/^(?:SUBSEÇÃO|Subseção)\s+([IVXLCDM\d\.\-]+)/i);
      const artMatch = trimmed.match(/^(?:Art\.|Artigo)\s*(\d+[ºª\.]?)/i);

      if (capMatch || secMatch || subMatch || artMatch) {
        flushBlock(); // Novo marcador estrutural encerra o bloco anterior
        
        if (capMatch) currentChapter = capMatch[0];
        if (secMatch) currentSection = secMatch[0];
        if (subMatch) currentSubSection = subMatch[0];
        if (artMatch) currentArticle = artMatch[0];

        // Se for só o título (ex: "Art. 117."), não criamos bloco ainda
        if (trimmed.length < currentArticle.length + 5 && artMatch) return;
        if (capMatch || secMatch || subMatch) return;
      }

      // Detectar sub-itens que iniciam novos blocos (Incisos, Alíneas, Parágrafos)
      // Ex: "I -", "a)", "§ 1º", "Parágrafo único"
      const isSubItem = trimmed.match(/^([IVXLCDM]+\s*[-–—]|§\s*\d|[a-z]\)|Parágrafo\s+único)/i);
      if (isSubItem) {
        flushBlock();
      }

      // Gerar contexto atual
      const contextParts = [
        activeTab === 'estatuto' ? "Estatuto Social" : "Regimento Interno",
        currentChapter,
        currentSection,
        currentSubSection,
        currentArticle
      ].filter(Boolean);
      const contextStr = contextParts.join(", ");

      if (!currentBlock) {
        currentBlock = { text: trimmed, context: contextStr };
      } else {
        // Se já existe um bloco, verificamos se ele deve continuar
        // Se a linha anterior não terminou em ponto, ou se esta linha não começa com letra maiúscula, etc.
        // Mas o mais seguro em documentos colados é juntar com um espaço
        currentBlock.text += " " + trimmed;
      }
    });

    flushBlock(); // Flush final
    
    console.log(`Total de blocos identificados: ${blocks.length}`);
    return blocks;
  }, [activeText, activeTab]);

  const filtered = useMemo(() => {
    if (!query) return articles;
    const lowerQ = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return articles.filter(a => {
      const normalizedA = a.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedC = a.context.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalizedA.includes(lowerQ) || normalizedC.includes(lowerQ);
    });
  }, [articles, query]);

  const handleSelect = (block: LegalBlock) => {
    onSelect(block.fullText);
    onClose();
    setQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 bg-slate-50">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center shadow-md relative">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-90 drop-shadow-sm" />
          <DialogTitle className="text-2xl font-bold font-display tracking-tight text-white">Base Legal Digital</DialogTitle>
          <DialogDescription className="text-indigo-100 font-medium text-sm mt-1">
            Busque termos no Estatuto ou no Regimento Interno para citar na sua ata.
          </DialogDescription>
        </div>
        
        <div className="bg-slate-100 border-b flex justify-center p-2">
          <div className="bg-white rounded-lg p-1 shadow-sm inline-flex">
            <button
              onClick={() => { setActiveTab('estatuto'); setQuery(""); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'estatuto' 
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Estatuto Social
            </button>
            <button
              onClick={() => { setActiveTab('regimento'); setQuery(""); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'regimento' 
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Regimento Interno
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-white relative z-10">
          <div className="relative shadow-sm rounded-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
              placeholder={`Pesquisar no ${activeTab === 'estatuto' ? 'Estatuto' : 'Regimento'}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3 bg-slate-50">
          {!activeText ? (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm">
                O {activeTab === 'estatuto' ? 'Estatuto' : 'Regimento Interno'} ainda não foi cadastrado.<br/>
                Vá em <strong className="text-indigo-600">Configurações &gt; Base Legal</strong> para preencher o texto.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              Nenhum artigo encontrado com "{query}"
            </p>
          ) : (
            filtered.map((block, i) => (
              <div 
                key={i} 
                className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => handleSelect(block)}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{block.context}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed group-hover:text-slate-900 transition-all">
                  {block.text}
                </p>
                <div className="mt-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    Citar com Contexto
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
