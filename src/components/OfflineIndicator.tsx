import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>
        <strong>Modo Offline Ativado:</strong> Você está sem conexão com a internet. Os dados estão salvos localmente e
        serão sincronizados ao restabelecer a rede.
      </span>
    </div>
  );
}

