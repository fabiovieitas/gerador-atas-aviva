import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Eye, Clock, User, Church, Filter, Image as ImageIcon, Users, ExternalLink, Book, CheckSquare, X, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAtaStore } from "@/hooks/useAtaStore";
// import html2pdf from 'html2pdf.js';

interface AtaRow {
  id: string;
  titulo: string;
  conteudo: string | null;
  dados_json: any;
  church_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  foto_assinatura_url?: string;
  fotosAssinaturaUrls?: string[];
  church_nome?: string;
  autor_nome?: string;
  editor_nome?: string;
}

interface ChurchOption {
  id: string;
  nome: string;
}

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function HistoricoPage({ store }: Props) {
  const { profile, isAdmin, isMaster } = useAuth();
  const navigate = useNavigate();
  const [atas, setAtas] = useState<AtaRow[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [churchFilter, setChurchFilter] = useState<string>("all");
  const [selecaoModo, setSelecaoModo] = useState(false);
  const [atasSelecionadas, setAtasSelecionadas] = useState<string[]>([]);
  const [churchInfo, setChurchInfo] = useState<{nome: string} | null>(null);

  const fetchAtas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("atas")
        .select("*, churches(nome), creator:profiles!atas_created_by_fkey(nome), editor:profiles!atas_updated_by_fkey(nome)");

      // Filtra pela igreja selecionada no seletor global (store)
      if (store.selectedChurchId) {
        query = query.eq('church_id', store.selectedChurchId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("atas")
          .select("*")
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        const [profilesRes, churchesRes] = await Promise.all([
          supabase.from("profiles").select("user_id, nome"),
          supabase.from("churches").select("id, nome"),
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.nome]));
        const churchMap = new Map((churchesRes.data || []).map((c) => [c.id, c.nome]));

        const mapped = (fallbackData || []).map((a) => ({
          ...a,
          church_nome: a.church_id ? churchMap.get(a.church_id) || "—" : "—",
          autor_nome: profileMap.get(a.created_by) || "—",
          fotosAssinaturaUrls: a.dados_json?.fotosAssinaturaUrls || (a.foto_assinatura_url ? [a.foto_assinatura_url] : []),
        }));

        setAtas(mapped);
        if (churchesRes.data) setChurches(churchesRes.data);
      } else {
        const churchesRes = await supabase.from("churches").select("id, nome");
        if (churchesRes.data) setChurches(churchesRes.data);

        const mapped = (data || []).map((a: any) => ({
          ...a,
          church_nome: a.churches?.nome || "—",
          autor_nome: a.creator?.nome || "—",
          editor_nome: a.editor?.nome || null,
          fotosAssinaturaUrls: a.dados_json?.fotosAssinaturaUrls || (a.foto_assinatura_url ? [a.foto_assinatura_url] : []),
        }));
        setAtas(mapped);
      }

      // Buscar info da igreja atual para o livro de atas
      if (profile?.church_id) {
        const { data: cData } = await supabase.from("churches").select("nome").eq("id", profile.church_id).single();
        if (cData) setChurchInfo(cData as any);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar atas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Se temos o perfil ou se já sabemos o id da igreja no store
    if (profile || store.selectedChurchId) {
      fetchAtas();
    } else {
      // Se não tem perfil nem igreja no store, mas terminou o auth loading, para de carregar
      const timer = setTimeout(() => {
        if (loading) setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [profile?.id, store.selectedChurchId]);

  const handleExcluir = async (ata: AtaRow) => {
    const confirmar = window.confirm(`Deseja realmente apagar a ata "${ata.titulo}"?`);
    if (!confirmar) return;

    const { error } = await supabase.from("atas").delete().eq("id", ata.id);
    if (error) {
      toast.error("Erro ao apagar ata.");
      return;
    }
    toast.success("Ata apagada com sucesso.");
    setAtas((prev) => prev.filter((a) => a.id !== ata.id));
    setAtasSelecionadas((prev) => prev.filter((id) => id !== ata.id));
  };

  const handleToggleSelecao = (id: string) => {
    setAtasSelecionadas((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Gera o livro de atas usando uma janela temporária.
// Caso a abertura da aba seja bloqueada, faz fallback para download de HTML.
const gerarLivroAtas = async () => {
  if (atasSelecionadas.length === 0) {
    toast.error("Selecione pelo menos uma ata.");
    return;
  }

  const selecionadas = [...atas.filter(a => atasSelecionadas.includes(a.id))];
  selecionadas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const anoAtual = new Date().getFullYear();
  const churchNome = churchInfo?.nome || "Igreja Evangélica AVIVA";
  const atasHtml = selecionadas.map((ata, index) => {
    const rawLines = (ata.conteudo || "Conteúdo não encontrado.").split('\n').map(l => l.trim()).filter(Boolean);
    
    let htmlParts: string[] = [];
    rawLines.forEach(line => {
      if (line === '{{ASSINATURAS}}') return;
      if (line.startsWith('ATA DE ASSEMBLEIA') || line.startsWith('ATA DA ASSEMBLEIA')) {
        htmlParts.push(`<p class="titulo">${line}</p>`);
      } else {
        htmlParts.push(`<p>${line}</p>`);
      }
    });

    const secNome = ata.dados_json?.nomeSecretario || '___';
    const presNome = ata.dados_json?.pastorDirigente || '___';
    const signatureHtml = `
      <div class="assinaturas" style="margin-top: 60px; page-break-inside: avoid;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 45%; border-top: 1px solid black; text-align: center; font-family: 'Calibri', sans-serif; font-size: 11pt; padding-top: 5px;">
              ${secNome}<br/>
              <span style="font-size: 10pt;">Secretário(a)</span>
            </td>
            <td style="width: 10%;">&nbsp;</td>
            <td style="width: 45%; border-top: 1px solid black; text-align: center; font-family: 'Calibri', sans-serif; font-size: 11pt; padding-top: 5px;">
              ${presNome}<br/>
              <span style="font-size: 10pt;">Pastor 1º Dirigente</span>
            </td>
          </tr>
        </table>
      </div>`;
      
    htmlParts.push(signatureHtml);
    
    const quebra = index < selecionadas.length - 1 ? 'style="page-break-after:always;"' : '';
    return `<div class="ata-page" ${quebra}>${htmlParts.join('\n')}</div>`;
  }).join('\n');

  const logoHtml = churchInfo?.logo_url 
    ? `<img src="${churchInfo.logo_url}" alt="Logo" style="max-height: 120px; max-width: 250px; margin-bottom: 40px;" />` 
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Livro de Atas ${anoAtual} - ${churchNome}</title>
  <style>
    @page { size: A4; margin: 2.5cm; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 13pt; color: #000; background: #fff; text-align: justify; line-height: 1.15; }
    p { margin: 0; margin-bottom: 11pt; text-indent: 1.25cm; }
    .titulo { font-weight: bold; text-align: right; margin-left: 5cm; margin-bottom: 24pt; text-indent: 0; text-transform: uppercase; }
    h1, h2 { text-align: center; margin: 0; padding: 0; }
    .capa { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; text-align: center; page-break-after: always; }
    .capa p { text-indent: 0; text-align: center; }
  </style>
</head>
<body>
  <div class="capa">
    ${logoHtml}
    <h1 style="font-size:36pt; margin-bottom:20px;">LIVRO DE ATAS</h1>
    <h2 style="font-size:24pt; font-weight:normal; text-transform:uppercase;">${churchNome}</h2>
    <p style="font-size:14pt; margin-top:50px;">Registro Oficial de Assembleias</p>
    <p style="font-size:14pt; margin-top:20px;">Volume ${anoAtual}</p>
  </div>
  ${atasHtml}
</body>
</html>`;

  // 1️⃣ Tenta abrir uma nova janela para impressão
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    // Escreve o HTML na nova janela
    printWindow.document.write(html);
    printWindow.document.close(); // garante que o DOM seja finalizado

    // Espera o carregamento completo (incluindo imagens) antes de imprimir
    printWindow.onload = () => {
      // Pequeno delay para garantir que fontes e imagens estejam rendendo
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Fecha a janela após a impressão (opcional – pode comentar)
        // printWindow.close();
      }, 300);
    };

    toast.success(`Livro de Atas aberto em nova aba. Use a caixa de impressão para salvar como PDF.`);
  } else {
    // 2️⃣ Fallback: download do HTML (pop‑up bloqueado)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Livro_de_Atas_${anoAtual}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.warning(`Pop‑up bloqueado – o livro foi baixado. Abra o arquivo e use Ctrl+P para imprimir.`);
  }

  // Reseta o modo de seleção apenas depois que a ação de impressão for concluída
  setSelecaoModo(false);
  setAtasSelecionadas([]);
};
    
  const atasFiltradas = useMemo(() => {
    let result = atas;
    if (churchFilter !== "all") {
      result = result.filter((a) => a.church_id === churchFilter);
    }
    const termo = busca.trim().toLowerCase();
    if (termo) {
      result = result.filter((a) => {
        const dataFormatada = new Date(a.created_at).toLocaleDateString("pt-BR");
        const conteudoDaAta = (a.conteudo || "").toLowerCase();
        
        return (
          a.titulo.toLowerCase().includes(termo) ||
          (a.church_nome || "").toLowerCase().includes(termo) ||
          (a.autor_nome || "").toLowerCase().includes(termo) ||
          dataFormatada.includes(termo) ||
          conteudoDaAta.includes(termo)
        );
      });
    }
    return result;
  }, [atas, busca, churchFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Histórico de Atas</h1>
          <p className="text-sm text-muted-foreground mt-1">{atas.length} ata(s) no sistema</p>
        </div>
        <div className="flex gap-2">
          {selecaoModo ? (
            <>
              <Button onClick={() => { setSelecaoModo(false); setAtasSelecionadas([]); }} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={gerarLivroAtas} disabled={atasSelecionadas.length === 0} size="sm" className="gap-2">
                <Book className="w-4 h-4" /> Gerar Livro ({atasSelecionadas.length})
              </Button>
            </>
          ) : (
            <Button onClick={() => setSelecaoModo(true)} variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
              <CheckSquare className="w-4 h-4" /> Selecionar para Livro
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, conteúdo, igreja ou data..."
          className="flex-1"
        />
        {isAdmin && churches.length > 1 && (
          <Select value={churchFilter} onValueChange={setChurchFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Todas as igrejas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as igrejas</SelectItem>
              {churches.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="section-card text-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando atas...</p>
        </div>
      ) : atasFiltradas.length === 0 ? (
        <div className="section-card text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma ata encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atasFiltradas.map((ata) => (
            <div key={ata.id} className={`section-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${atasSelecionadas.includes(ata.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''}`}>
              <div className="min-w-0 flex-1 flex items-start gap-4">
                {selecaoModo && (
                  <input 
                    type="checkbox"
                    checked={atasSelecionadas.includes(ata.id)}
                    onChange={() => handleToggleSelecao(ata.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{ata.titulo}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {new Date(ata.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {ata.church_nome && ata.church_nome !== "—" && (
                      <span className="flex items-center gap-1">
                        <Church className="w-3 h-3 text-primary" />
                        {ata.church_nome}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" />
                      <span className="font-medium text-foreground">{ata.autor_nome}</span>
                    </span>
                    {ata.editor_nome && ata.editor_nome !== ata.autor_nome && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 italic opacity-80">
                          <RefreshCcw className="w-3 h-3" />
                          Edição: {ata.editor_nome}
                        </span>
                        {ata.dados_json?.areasModificadas && ata.dados_json.areasModificadas.length > 0 && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100/50 border border-amber-200 rounded px-2 py-0.5 ml-1">
                            Alterou: {ata.dados_json.areasModificadas.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
                      <FileText className="w-3.5 h-3.5" /> Ver
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Visualizar Ata: {ata.titulo}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto mt-4 p-6 bg-muted/30 rounded-lg border font-serif leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                      {ata.conteudo || "O texto desta ata não foi encontrado."}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="secondary" size="sm" onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          win.document.write(`<html><head><title>${ata.titulo}</title><style>body{font-family:serif;padding:40px;line-height:1.6;}</style></head><body><pre style="white-space:pre-wrap;">${ata.conteudo}</pre></body></html>`);
                          win.document.close();
                          win.print();
                        }
                      }}>
                        Imprimir
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button size="sm" onClick={() => navigate(`/nova-ata?ata=${ata.id}`)} variant="secondary" className="gap-1">
                  <Eye className="w-3.5 h-3.5" /> Editar
                </Button>
                
                {ata.fotosAssinaturaUrls && ata.fotosAssinaturaUrls.length > 0 ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 border-cyan-500/20 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30">
                        <ImageIcon className="w-3.5 h-3.5" /> Assinaturas ({ata.fotosAssinaturaUrls.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Folhas de Assinaturas - {ata.titulo}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 mt-4">
                        {ata.fotosAssinaturaUrls.map((url, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Página {i + 1}</span>
                              <Button asChild size="sm" variant="ghost" className="h-7 text-[10px]">
                                <a href={url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Original
                                </a>
                              </Button>
                            </div>
                            <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                              <img src={url} className="max-w-full h-auto object-contain" alt={`Assinaturas página ${i + 1}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="sm" variant="outline" disabled className="gap-1 opacity-40">
                    <ImageIcon className="w-3.5 h-3.5" /> Sem Assinaturas
                  </Button>
                )}

                {ata.dados_json?.membrosPresentes ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Users className="w-3.5 h-3.5" /> Presentes
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Membros Presentes ({ata.dados_json.membrosPresentes.length})</DialogTitle>
                      </DialogHeader>
                      <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-1">
                        {[...(ata.dados_json.membrosPresentes as string[])].sort().map((m, i) => (
                          <div key={i} className="text-sm p-2 rounded border bg-muted/20">
                            {m}
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="sm" variant="outline" disabled className="gap-1 opacity-40">
                    <Users className="w-3.5 h-3.5" /> Sem Lista
                  </Button>
                )}

                <Button size="sm" variant="ghost" onClick={() => handleExcluir(ata)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {(isAdmin || isMaster) && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 shrink-0 h-fit">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-indigo-800">Livro de Atas Anual</h4>
              <p className="text-xs text-indigo-700 leading-relaxed mt-1">
                Use o botão <strong>"Selecionar para Livro"</strong> para marcar as atas que deseja unir em um único arquivo. 
                O sistema gerará automaticamente uma capa e organizará as páginas para impressão oficial.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-4">
          <div className="p-2 bg-slate-200 rounded-full text-slate-600 shrink-0 h-fit">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">Busca Inteligente</h4>
            <p className="text-xs text-slate-700 leading-relaxed mt-1">
              Você pode buscar por qualquer termo: nome de um membro presente, uma decisão específica ou a data da reunião. 
              O filtro de igrejas ajuda a organizar o histórico se você gerencia múltiplas unidades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


