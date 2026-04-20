import { useAtaStore } from "@/hooks/useAtaStore";
import { BackupRestore } from "@/components/BackupRestore";
import { Settings } from "lucide-react";

interface Props {
  store: ReturnType<typeof useAtaStore>;
}

export function ConfiguracoesPage({ store }: Props) {
  const handleExport = () => ({
    membros: store.membros,
    historico: store.historico,
    defaults: store.defaults,
  });

  const handleImport = (data: { membros?: any[]; historico?: any[]; defaults?: Record<string, string> }) => {
    if (data.membros) localStorage.setItem('membrosAvivaAta', JSON.stringify(data.membros));
    if (data.historico) localStorage.setItem('atasAvivaHistorico2025', JSON.stringify(data.historico));
    if (data.defaults) localStorage.setItem('ataDefaults', JSON.stringify(data.defaults));
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
          <Settings className="w-7 h-7" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie backups e preferências do sistema</p>
      </div>

      <BackupRestore onExport={handleExport} onImport={handleImport} />
    </div>
  );
}
