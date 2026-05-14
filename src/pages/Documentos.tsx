import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAtaStore } from "@/hooks/useAtaStore";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Plus, 
  BookOpen, 
  ShieldCheck,
  AlertCircle,
  Search,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OfficialDocument {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
  church_id: string | null;
}

export function DocumentosPage() {
  const { isAdmin, isMaster, profile } = useAuth();
  const store = useAtaStore();
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [listType, setListType] = useState("Ordinária");
  const [listDate, setListDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateDisplay, setDateDisplay] = useState("month"); // 'month' or 'year'
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Geral");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const gerarListaPresenca = () => {
    const churchName = store.churchInfo?.nome || "Igreja Evangélica Aviva";
    const cityState = store.churchInfo?.cidade ? `, de ${store.churchInfo.cidade}/${store.churchInfo.estado}` : "";
    const year = listDate.split('-')[0];
    const month = listDate.split('-')[1];
    const dateFormatted = dateDisplay === "month" 
      ? `____/${month}/${year}` 
      : `____/_____/${year}`;
    
    const div = document.createElement('div');
    div.style.padding = '20px 40px';
    div.style.fontFamily = "'Calibri', 'Arial', sans-serif";
    div.style.color = "#000";
    div.style.backgroundColor = "#fff";

    const htmlContent = `
      <div style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 40px; line-height: 1.3;">
        Lista de assinaturas da Assembleia ${listType} da<br/>
        ${churchName}${cityState}, do dia ${dateFormatted}.
      </div>

      <style>
        tr { page-break-inside: avoid; }
      </style>
      <section style="page-break-after: always;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12pt;">
          ${['Dirigente', 'Vice-Dirigente', '1ª Secretário', '2ª Secretário', '1ª Tesoureira', '2ª Tesoureira'].map((cargo, i) => `
            <tr style="page-break-inside: avoid;">
              <td style="padding: 8px 5px 2px 0; width: 180px; border-bottom: 1px solid black; font-weight: 500;">${i+1}. ${cargo}</td>
              <td style="padding: 8px 5px 2px 0; border-bottom: 1px solid black;">&nbsp;</td>
            </tr>
          `).join('')}
          ${Array.from({ length: 17 }).map((_, i) => `
            <tr style="page-break-inside: avoid;">
              <td style="padding: 8px 5px 2px 0; width: 40px; border-bottom: 1px solid black;">${i+7}.</td>
              <td style="padding: 8px 5px 2px 0; border-bottom: 1px solid black;">&nbsp;</td>
            </tr>
          `).join('')}
        </table>
      </section>

      <section>
        <table style="width: 100%; border-collapse: collapse; font-size: 12pt; margin-top: 5px;">
          ${Array.from({ length: 28 }).map((_, i) => `
            <tr style="page-break-inside: avoid;">
              <td style="padding: 8px 5px 2px 0; width: 40px; border-bottom: 1px solid black;">${i+24}.</td>
              <td style="padding: 8px 5px 2px 0; border-bottom: 1px solid black;">&nbsp;</td>
            </tr>
          `).join('')}
        </table>
      </section>
    `;

    div.innerHTML = htmlContent;

    const opt = {
      margin:       [15, 10, 15, 10],
      filename:     `Lista_Presenca_${listType}_${listDate}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: false, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    toast.info("Gerando PDF oficial...");
    
    // @ts-ignore
    import('html2pdf.js').then((html2pdfModule) => {
      const h2p = html2pdfModule.default || html2pdfModule;
      h2p().from(div).set(opt).save().then(() => {
        toast.success("PDF da lista gerado com sucesso!");
        setIsListOpen(false);
      });
    }).catch(err => {
      console.error(err);
      toast.error("Erro ao carregar gerador de PDF.");
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("official_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setDocuments(data);
    } catch (error: any) {
      toast.error("Erro ao carregar documentos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error("Por favor, preencha o título e selecione um arquivo.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('official_docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('official_docs')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('official_documents')
        .insert({
          title,
          description,
          category,
          file_url: publicUrl,
          church_id: profile?.church_id
        });

      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso!");
      setIsUploadOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      toast.error("Erro no envio: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      const pathParts = url.split('/');
      const fileName = pathParts[pathParts.length - 1];

      await supabase.storage.from('official_docs').remove([fileName]);
      await supabase.from('official_documents').delete().eq('id', id);

      toast.success("Documento excluído.");
      fetchDocuments();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Geral");
    setFile(null);
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Repositório e Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Estatuto, Regimentos e Gerador de Listas de Presença.
          </p>
        </div>

        <div className="flex gap-2">
          {/* Gerador de Lista de Presença */}
          <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5 shadow-sm">
                <FileText className="w-4 h-4" /> Gerar Lista de Presença
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Gerar Lista de Presença</DialogTitle>
                <DialogDescription>
                  Crie uma folha oficial de assinaturas para a assembleia física.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Assembleia</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={listType}
                    onChange={(e) => setListType(e.target.value)}
                  >
                    <option value="Ordinária">Ordinária</option>
                    <option value="Extraordinária">Extraordinária</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da Reunião</label>
                  <Input 
                    type="date" 
                    value={listDate}
                    onChange={(e) => setListDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exibição da Data no PDF</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={dateDisplay}
                    onChange={(e) => setDateDisplay(e.target.value)}
                  >
                    <option value="month">Fixar Mês e Ano (____/MM/AAAA)</option>
                    <option value="year">Fixar apenas Ano (____/____/AAAA)</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsListOpen(false)}>Cancelar</Button>
                <Button onClick={gerarListaPresenca} className="gap-2">
                  <Download className="w-4 h-4" /> Gerar PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload de Documentos */}
          {(isAdmin || isMaster) && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg">
                  <Upload className="w-4 h-4" /> Enviar Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Documento</DialogTitle>
                  <DialogDescription>
                    Adicione documentos oficiais para visualização de todos os membros.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título</label>
                    <Input 
                      placeholder="Ex: Estatuto Social 2024" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Estatuto">Estatuto</option>
                      <option value="Regimento">Regimento Interno</option>
                      <option value="Normas">Normas e Procedimentos</option>
                      <option value="Geral">Geral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição (Opcional)</label>
                    <Input 
                      placeholder="Breve resumo do conteúdo" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-destructive">* Arquivo (PDF recomendado)</label>
                    <Input 
                      type="file" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancelar</Button>
                  <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                    {uploading ? "Enviando..." : <><Plus className="w-4 h-4" /> Salvar</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-xl border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por título ou categoria..." 
          className="border-0 focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="group relative bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                    {doc.category}
                  </Badge>
                </div>
                
                <h3 className="font-display font-bold text-lg mb-1 line-clamp-1">{doc.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {doc.description || "Nenhuma descrição fornecida."}
                </p>
                
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Documento Oficial AVIVA</span>
                </div>
              </div>

              <div className="p-4 bg-muted/30 border-t flex items-center justify-between gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 gap-2 hover:bg-primary/10 hover:text-primary"
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <FileDown className="w-4 h-4" /> Baixar / Ver
                </Button>
                
                {(isAdmin || isMaster) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(doc.id, doc.file_url)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl">Nenhum documento encontrado</h3>
                <p className="text-muted-foreground">O arquivo digital ainda está vazio ou nenhum item corresponde à busca.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4">
        <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0 h-fit">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-primary">Sobre os Documentos Oficiais</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Estes arquivos são de caráter informativo e jurídico. O Estatuto Social define a estrutura da Igreja AVIVA, 
            enquanto o Regimento Interno estabelece as normas de convivência e processos disciplinares. 
            Todos os membros têm direito ao acesso integral destes textos.
          </p>
        </div>
      </div>
    </div>
  );
}
