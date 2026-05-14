import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Database, Download, Cloud, ShieldCheck, AlertTriangle, FileJson, FileText, CheckCircle2, Loader2, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChurchData {
  id: string;
  nome: string;
}

export function BackupPage() {
  const { profile, isAdmin, isMaster } = useAuth();
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin || isMaster) {
      supabase.from('churches').select('id, nome').order('nome').then(({ data }) => {
        if (data) setChurches(data);
      });
    } else if (profile?.church_id) {
      // Para usuários comuns, mostra apenas a própria igreja
      supabase.from('churches').select('id, nome').eq('id', profile.church_id).single().then(({ data }) => {
        if (data) setChurches([data]);
      });
    }
  }, [isAdmin, isMaster, profile]);

  const handleExportJson = async (church: ChurchData) => {
    setExportingId(church.id);
    try {
      // Busca tudo da igreja
      const [atasRes, membrosRes, tasksRes, auditRes] = await Promise.all([
        supabase.from('atas').select('*').eq('church_id', church.id),
        supabase.from('membros').select('*').eq('church_id', church.id),
        supabase.from('assembly_tasks').select('*').eq('church_id', church.id),
        supabase.from('audit_logs').select('*').eq('church_id', church.id).limit(1000)
      ]);

      const backup = {
        versao: "1.0",
        data_exportacao: new Date().toISOString(),
        igreja: church,
        dados: {
          atas: atasRes.data || [],
          membros: membrosRes.data || [],
          pendencias: tasksRes.data || [],
          auditoria_recente: auditRes.data || []
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      link.download = `backup_aviva_${church.nome.replace(/\s+/g, '_').toLowerCase()}_${dataStr}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Backup da igreja ${church.nome} gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar backup.");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Backup & Exportação</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie a segurança dos dados das suas igrejas</p>
        </div>
        <Cloud className="w-10 h-10 text-primary opacity-20" />
      </div>

      <div className="grid gap-6">
        {/* Aviso de Segurança */}
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
          <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 shrink-0 h-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-indigo-800">Segurança de Dados (GDPR/LGPD)</h4>
            <p className="text-xs text-indigo-700 leading-relaxed mt-1">
              O sistema AVIVA utiliza o Supabase para armazenamento criptografado. No entanto, recomendamos realizar um backup offline mensal para garantir a soberania dos dados da sua igreja local.
            </p>
          </div>
        </div>

        {/* Lista de Igrejas para Backup */}
        <div className="section-card space-y-6">
          <h2 className="section-title flex items-center gap-2">
            <Database className="w-5 h-5" /> Backups Disponíveis
          </h2>

          <div className="grid gap-3">
            {churches.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8 italic">Buscando igrejas...</p>
            )}
            {churches.map(church => (
              <div key={church.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/10 transition-all gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Church className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{church.nome}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">{church.id}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleExportJson(church)} 
                    disabled={exportingId === church.id}
                    size="sm" 
                    variant="outline" 
                    className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                  >
                    {exportingId === church.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
                    Backup Completo (JSON)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informação sobre Google Drive */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
          <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0 h-fit">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-800">Sincronização com Google Drive</h4>
            <p className="text-xs text-amber-700 leading-relaxed mt-1">
              A exportação para o Google Drive exige uma chave de API específica da sua igreja. 
              Por enquanto, use o botão **"Backup Completo"** acima para baixar os dados e salvá-los manualmente na sua pasta do Drive. 
              Isso garante que cada igreja tenha seu arquivo separado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
