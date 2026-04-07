import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Props {
  onExport: () => { membros: any[]; historico: any[]; defaults: Record<string, string> };
  onImport: (data: { membros?: any[]; historico?: any[]; defaults?: Record<string, string> }) => void;
}

export function BackupRestore({ onExport, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `backup_atas_aviva_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado com sucesso!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onImport(data);
        toast.success("Backup restaurado! Os dados foram atualizados.");
      } catch {
        toast.error("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="section-card">
      <h2 className="section-title flex items-center gap-2">
        <Database className="w-5 h-5" /> Backup e Restauração
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Exporte todos os dados (membros, atas e configurações) ou restaure a partir de um backup anterior.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Exportar Backup
          </h3>
          <p className="text-xs text-muted-foreground">
            Salva membros, histórico de atas e configurações em um arquivo JSON.
          </p>
          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="w-4 h-4" /> Baixar Backup
          </Button>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent-foreground" /> Restaurar Backup
          </h3>
          <p className="text-xs text-muted-foreground">
            Restaura dados a partir de um arquivo JSON exportado anteriormente.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Upload className="w-4 h-4" /> Restaurar Dados
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" /> Restaurar Backup
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Esta ação substituirá os dados atuais (membros, atas e configurações) pelos dados do arquivo. Deseja continuar?
              </p>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" /> Selecionar Arquivo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
