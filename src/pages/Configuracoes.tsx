import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Settings, Building2, Palette, FileCode2, Save, 
  Upload, Database, RefreshCw, Globe, TextQuote
} from "lucide-react";
import { useAtaStore } from "@/hooks/useAtaStore";
import { BackupRestore } from "@/components/BackupRestore";

interface ChurchData {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  logo_url: string;
  settings: {
    texto_abertura: string;
    texto_fechamento: string;
    cor_principal: string;
  };
}

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function ConfiguracoesPage({ store }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [church, setChurch] = useState<ChurchData | null>(null);

  useEffect(() => {
    fetchChurchData();
  }, [profile?.church_id]);

  const fetchChurchData = async () => {
    if (!profile?.church_id) return;
    try {
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .eq("id", profile.church_id)
        .single();

      if (error) throw error;
      
      // Garantir que settings tenha valores padrão se vier vazio
      const defaultSettings = {
        texto_abertura: "ATA DE ASSEMBLEIA [TIPO] DA IGREJA EVANGÉLICA AVIVA. Aos [DIA] dias do mês de [MÊS] de [ANO], às [HORA], no [LOCAL], sob a presidência do [PASTOR], reuniu-se a igreja para deliberar sobre [ASSUNTO].",
        texto_fechamento: "Nada mais havendo a tratar, a reunião foi encerrada às [HORA_FIM] com uma oração.",
        cor_principal: "#0ea5e9"
      };

      setChurch({
        ...data,
        settings: { ...defaultSettings, ...(data.settings || {}) }
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveChurch = async () => {
    if (!church || !profile?.church_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("churches")
        .update({
          nome: church.nome,
          cnpj: church.cnpj,
          endereco: church.endereco,
          logo_url: church.logo_url,
          settings: church.settings
        })
        .eq("id", profile.church_id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    if (!church) return;
    setChurch({
      ...church,
      settings: { ...church.settings, [key]: value }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.church_id) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${profile.church_id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assinaturas_atas')
        .upload(`logos/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assinaturas_atas')
        .getPublicUrl(`logos/${fileName}`);

      setChurch(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      toast.success("Logo enviada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!church) return <div className="p-10 text-center">Carregando configurações...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <Settings className="w-7 h-7 text-primary" /> Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize o comportamento do gerador de atas</p>
        </div>
        <Button onClick={handleSaveChurch} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Tudo
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="geral" className="gap-2"><Building2 className="w-4 h-4" /> Igreja</TabsTrigger>
          <TabsTrigger value="visual" className="gap-2"><Palette className="w-4 h-4" /> Visual</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><TextQuote className="w-4 h-4" /> Templates</TabsTrigger>
          <TabsTrigger value="backup" className="gap-2"><Database className="w-4 h-4" /> Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card className="p-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 p-4 bg-muted/30 rounded-xl border-2 border-dashed border-primary/20">
                <div className="w-32 h-32 rounded-lg bg-background border overflow-hidden flex items-center justify-center shadow-inner group relative">
                  {church.logo_url ? (
                    <img src={church.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                  ) : (
                    <Building2 className="w-12 h-12 text-muted-foreground/30" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer p-2 bg-primary rounded-full text-white hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={loading} />
                    </label>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Logotipo Oficial</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Aparecerá no topo das atas</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Igreja</label>
                    <Input value={church.nome} onChange={e => setChurch({ ...church, nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CNPJ</label>
                    <Input value={church.cnpj || ""} onChange={e => setChurch({ ...church, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Endereço Completo</label>
                  <Input value={church.endereco || ""} onChange={e => setChurch({ ...church, endereco: e.target.value })} placeholder="Rua, Número, Bairro, Cidade - UF" />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4">Cor do Sistema</h3>
            <div className="flex items-center gap-6">
              <input 
                type="color" 
                value={church.settings.cor_principal} 
                onChange={e => updateSetting("cor_principal", e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer border-2"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">Cor de Destaque</p>
                <p className="text-xs text-muted-foreground">Esta cor será aplicada em botões e menus</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-6">
            <div className="mb-6 p-3 bg-primary/5 rounded border border-primary/10">
              <p className="text-xs font-bold text-primary mb-1">Dica de Variáveis:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Use os códigos: <b>[DIA]</b>, <b>[MÊS]</b>, <b>[ANO]</b>, <b>[HORA]</b>, <b>[LOCAL]</b>, <b>[PASTOR]</b>, <b>[TIPO]</b>, <b>[ASSUNTO]</b>, <b>[HORA_FIM]</b>.
                <br/>O sistema substituirá esses códigos automaticamente pelos dados da ata.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto de Abertura (Padrão)</label>
                <textarea 
                  className="w-full min-h-[120px] p-4 rounded-lg border bg-background text-sm leading-relaxed focus:ring-2 ring-primary"
                  value={church.settings.texto_abertura}
                  onChange={e => updateSetting("texto_abertura", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Texto de Encerramento (Padrão)</label>
                <textarea 
                  className="w-full min-h-[80px] p-4 rounded-lg border bg-background text-sm leading-relaxed focus:ring-2 ring-primary"
                  value={church.settings.texto_fechamento}
                  onChange={e => updateSetting("texto_fechamento", e.target.value)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <BackupRestore 
            onExport={() => ({
              membros: store.membros,
              historico: store.historico,
              defaults: store.defaults,
            })} 
            onImport={(data: any) => {
              if (data.membros) localStorage.setItem('membrosAvivaAta', JSON.stringify(data.membros));
              if (data.historico) localStorage.setItem('atasAvivaHistorico2025', JSON.stringify(data.historico));
              if (data.defaults) localStorage.setItem('ataDefaults', JSON.stringify(data.defaults));
              window.location.reload();
            }} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
