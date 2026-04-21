import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Eye, Clock, User, Church, Filter, Image as ImageIcon, Users, ExternalLink, Book, CheckSquare, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import html2pdf from 'html2pdf.js';
import { useAtaStore } from "@/hooks/useAtaStore";

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
}

interface ChurchOption {
  id: string;
  nome: string;
}

export function HistoricoPage() {
  const { profile, isAdmin } = useAuth();
  const store = useAtaStore();
  const navigate = useNavigate();
  const [atas, setAtas] = useState<AtaRow[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [churchFilter, setChurchFilter] = useState<string>("all");
  const [selecaoModo, setSelecaoModo] = useState(false);
  const [atasSelecionadas, setAtasSelecionadas] = useState<string[]>([]);

  const fetchAtas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("atas")
        .select("*, churches(nome), profiles!atas_created_by_fkey(nome)")
        .order("created_at", { ascending: false });

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
          autor_nome: a.profiles?.nome || "—",
          fotosAssinaturaUrls: a.dados_json?.fotosAssinaturaUrls || (a.foto_assinatura_url ? [a.foto_assinatura_url] : []),
        }));
        setAtas(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar atas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtas();
  }, []);

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

  const gerarLivroAtas = () => {
    if (atasSelecionadas.length === 0) return;
    
    // Pegar as atas selecionadas, com seus textos
    const selecionadas = atas.filter(a => atasSelecionadas.includes(a.id));
    
    // Ordenar cronologicamente (da mais antiga para a mais nova)
    selecionadas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let htmlParts = [];
    
    // Capa
    const anoAtual = new Date().getFullYear();
    const churchNome = store.churchInfo?.nome || "Igreja Evangélica AVIVA";
    const churchLogo = store.churchInfo?.logo_url ? `<img src="${store.churchInfo.logo_url}" style="max-width: 150px; max-height: 150px; margin-bottom: 20px;" />` : '';

    htmlParts.push(`
      <div style="page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; font-family: 'Times New Roman', Times, serif;">
        ${churchLogo}
        <h1 style="font-size: 36pt; margin-bottom: 20px;">LIVRO DE ATAS</h1>
        <h2 style="font-size: 24pt; font-weight: normal; text-transform: uppercase;">${churchNome}</h2>
        <p style="font-size: 14pt; margin-top: 50px;">Registro Oficial de Assembleias</p>
        <p style="font-size: 14pt; margin-top: 20px;">Volume - ${anoAtual}</p>
      </div>
    `);

    // Cabeçalho Oficial
    const headerHtml = store.churchInfo ? `
      <div style="text-align: center; margin-bottom: 30px; font-family: 'Times New Roman', Times, serif;">
        ${store.churchInfo.logo_url ? `<img src="${store.churchInfo.logo_url}" style="max-width: 100px; max-height: 100px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" />` : ''}
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">${store.churchInfo.nome}</div>
        <div style="font-size: 10pt; margin-top: 4px;">CNPJ: ${store.churchInfo.cnpj || '___'}</div>
        <div style="font-size: 10pt; margin-top: 2px;">${store.churchInfo.endereco || '___'}</div>
        <hr style="margin-top: 15px; border: 0; border-top: 1px solid #000;" />
      </div>
    ` : '';

    // Concatenar atas
    selecionadas.forEach((ata, index) => {
      const conteudoHtml = (ata.conteudo || "Conteúdo não encontrado.")
        .split('\\n')
        .map(line => line.trim())
        .filter(line => line !== '{{ASSINATURAS}}' && line !== '')
        .map(line => {
          if (line.startsWith('ATA DE ASSEMBLEIA')) {
            return `<p style="font-weight: bold; text-align: center; margin-bottom: 20pt; font-size: 14pt;">${line}</p>`;
          }
          return `<p style="text-align: justify; margin-bottom: 10pt; line-height: 1.5;">${line}</p>`;
        })
        .join('\\n');

      htmlParts.push(`<div ${index < selecionadas.length - 1 ? 'style="page-break-after: always;"' : ''}>`);
      htmlParts.push(headerHtml);
      htmlParts.push(conteudoHtml);
      htmlParts.push(`</div>`);
    });

    const finalHtml = `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; padding: 20px;">
        ${htmlParts.join('\n')}
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = finalHtml;

    const opt = {
      margin:       [20, 15, 20, 15],
      filename:     `Livro_de_Atas_${anoAtual}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    toast.info("Gerando Livro de Atas, isso pode levar alguns segundos...");
    html2pdf().from(div).set(opt).save().then(() => {
      toast.success("Livro de Atas gerado com sucesso!");
      setSelecaoModo(false);
      setAtasSelecionadas([]);
    });
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
              <Button onClick={gerarLivroAtas} disabled={atasSelecionadas.length === 0} size="sm" className="gap-2 bg-primary">
                <Book className="w-4 h-4" /> Gerar Livro ({atasSelecionadas.length})
              </Button>
            </>
          ) : (
            <Button onClick={() => setSelecaoModo(true)} variant="outline" size="sm" className="gap-2">
              <CheckSquare className="w-4 h-4" /> Criar Livro de Atas
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
                  <Checkbox 
                    checked={atasSelecionadas.includes(ata.id)}
                    onCheckedChange={() => handleToggleSelecao(ata.id)}
                    className="mt-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{ata.titulo}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ata.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  {ata.church_nome && ata.church_nome !== "—" && (
                    <span className="flex items-center gap-1">
                      <Church className="w-3 h-3" />
                      {ata.church_nome}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {ata.autor_nome}
                  </span>
                </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 shrink-0 sm:min-w-[420px] justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5 w-[100px]">
                      <FileText className="w-3.5 h-3.5" /> Ver Ata
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

                <Button size="sm" onClick={() => navigate(`/nova-ata?ata=${ata.id}`)} variant="secondary" className="w-[85px]">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                
                {ata.fotosAssinaturaUrls && ata.fotosAssinaturaUrls.length > 0 ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 border-cyan-500/20 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 min-w-[125px]">
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
                              <img 
                                src={url} 
                                className="max-w-full h-auto object-contain" 
                                alt={`Assinaturas página ${i + 1}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button size="sm" variant="outline" disabled className="gap-1 opacity-40 min-w-[125px]">
                    <ImageIcon className="w-3.5 h-3.5" /> Sem Assinaturas
                  </Button>
                )}

                {ata.dados_json?.membrosPresentes && (
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
                        {(ata.dados_json.membrosPresentes as string[]).sort().map((m, i) => (
                          <div key={i} className="text-sm p-2 rounded border bg-muted/20">
                            {m}
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => handleExcluir(ata)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
