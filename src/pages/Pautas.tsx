import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Calendar, MapPin, Printer, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAtaStore } from "@/hooks/useAtaStore";

interface Pauta {
  id: string;
  titulo: string;
  data_prevista: string;
  local_sugerido: string;
  itens: string[];
}

export function PautasPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const store = useAtaStore();
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [itens, setItens] = useState<string[]>([""]);

  useEffect(() => {
    fetchPautas();
  }, [profile?.church_id]);

  const fetchPautas = async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pautas")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("data_prevista", { ascending: true });

      if (error) throw error;
      setPautas(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar pautas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => setItens([...itens, ""]);
  
  const handleUpdateItem = (index: number, value: string) => {
    const newItens = [...itens];
    newItens[index] = value;
    setItens(newItens);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!titulo || !data) {
      toast.error("Preencha o título e a data.");
      return;
    }

    try {
      const { error } = await supabase.from("pautas").insert({
        titulo,
        data_prevista: data,
        local_sugerido: local,
        itens: itens.filter(i => i.trim() !== ""),
        church_id: profile?.church_id,
        created_by: profile?.user_id
      });

      if (error) throw error;
      
      toast.success("Pauta criada com sucesso!");
      setShowForm(false);
      setTitulo("");
      setData("");
      setLocal("");
      setItens([""]);
      fetchPautas();
    } catch (err: any) {
      toast.error("Erro ao salvar pauta: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja apagar esta pauta?")) return;
    try {
      await supabase.from("pautas").delete().eq("id", id);
      setPautas(pautas.filter(p => p.id !== id));
      toast.success("Pauta removida.");
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  const handleGerarAta = (pauta: Pauta) => {
    // Carregar dados na store
    store.limparFormulario();
    store.updateField("dataReuniao", pauta.data_prevista);
    store.updateField("localReuniao", pauta.local_sugerido);
    store.updateField("assuntosPrincipais", pauta.titulo);
    
    // Adicionar itens como deliberações iniciais
    pauta.itens.forEach(item => {
      const id = Date.now().toString() + Math.random();
      // Usando a função do store para adicionar deliberação
      // Como não temos um "addWithText", vamos adicionar e depois atualizar o último
      store.addDeliberacao();
    });

    // Nota: Como o store é assíncrono no state, vamos fazer um ajuste no useAtaStore depois 
    // para facilitar esse carregamento direto.
    
    navigate("/nova-ata");
    toast.success("Pauta carregada na Nova Ata!");
  };

  const handleImprimirPauta = (pauta: Pauta) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Pauta de Reunião - ${pauta.titulo}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            .info { margin: 20px 0; font-size: 14px; color: #666; }
            .item { margin: 15px 0; padding: 10px; border-bottom: 1px solid #eee; }
            .checkbox { display: inline-block; width: 15px; height: 15px; border: 1px solid #999; margin-right: 10px; vertical-align: middle; }
          </style>
        </head>
        <body>
          <h1>Pauta de Reunião</h1>
          <div className="info">
            <strong>Assunto:</strong> ${pauta.titulo}<br>
            <strong>Data:</strong> ${new Date(pauta.data_prevista).toLocaleDateString('pt-BR')}<br>
            <strong>Local:</strong> ${pauta.local_sugerido || '—'}
          </div>
          <h3>Assuntos a serem tratados:</h3>
          ${pauta.itens.map(item => `
            <div class="item">
              <span class="checkbox"></span>
              ${item}
            </div>
          `).join('')}
          <div style="margin-top: 50px; font-size: 10px; color: #999; text-align: center;">
            Gerador de Atas AVIVA
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Pautas de Reunião</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize os assuntos antes da assembleia</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Pauta
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6 border-primary/20 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Criar Agenda de Reunião</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título da Pauta</label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Assembleia de Membros de Novembro" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Prevista</label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Local Sugerido</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={local} onChange={e => setLocal(e.target.value)} className="pl-9" placeholder="Ex: Templo Sede" />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center justify-between">
                Itens da Pauta (Assuntos)
                <Button type="button" variant="ghost" size="sm" onClick={handleAddItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Adicionar Assunto
                </Button>
              </label>
              {itens.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex items-center justify-center w-8 h-10 text-xs font-bold bg-muted rounded-lg text-muted-foreground">
                    {index + 1}
                  </span>
                  <Input 
                    value={item} 
                    onChange={e => handleUpdateItem(index, e.target.value)} 
                    placeholder="Descreva o assunto..."
                    className="flex-1"
                  />
                  {itens.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Pauta</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">Carregando...</div>
        ) : pautas.length === 0 ? (
          <div className="section-card text-center py-16">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma pauta agendada.</p>
            <Button variant="link" onClick={() => setShowForm(true)}>Criar minha primeira pauta</Button>
          </div>
        ) : (
          pautas.map(p => (
            <div key={p.id} className="section-card hover:border-primary/40 transition-all group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Agendada</span>
                    <h3 className="font-bold text-foreground">{p.titulo}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.data_prevista).toLocaleDateString('pt-BR')}</span>
                    {p.local_sugerido && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.local_sugerido}</span>}
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {p.itens.length} assuntos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleImprimirPauta(p)} className="h-8 gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleGerarAta(p)} className="h-8 gap-1.5">
                    Gerar Ata <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
