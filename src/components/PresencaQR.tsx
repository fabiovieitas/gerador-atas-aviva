import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Download, Loader2, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  membros: { nome: string; cargo: string }[];
  membrosPresentes: string[];
  churchId: string | undefined;
  churchNome: string | undefined;
  onSync: (presentes: string[]) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  fotosAssinaturaUrls?: string[];
}

export function PresencaQR({ membros, membrosPresentes, churchId, churchNome, onSync, sessionId, setSessionId, fotosAssinaturaUrls = [] }: Props) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const checkinUrl = sessionToken
    ? `${window.location.origin}/marcar-presenca/${sessionToken}`
    : "";

  const handleOpen = async () => {
    // 1. Abre a interface NA HORA
    setOpen(true);

    // 2. Se já temos token, não fazemos nada
    if (sessionToken) return;

    if (!churchId) {
      toast.error("Igreja não configurada.");
      return;
    }

    // 3. Gera o token LOCALMENTE (Instantâneo)
    const newToken = crypto.randomUUID();
    setSessionToken(newToken);
    setIsCreating(true);

    // 4. Registra no banco em "background" (não trava a tela)
    try {
      const { data, error } = await supabase
        .from("assembly_sessions")
        .insert({
          titulo: "Presença em andamento",
          tipo: "Ata em elaboração",
          church_id: churchId,
          token: newToken,
          is_active: true,
          church_nome: churchNome || "",
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) setSessionId(data.id);
    } catch (err: any) {
      console.error("Erro background session:", err);
      // Se der erro no background, avisamos, mas o QR já está na tela
      toast.error("Erro ao sincronizar sessão. Tente novamente.");
      setSessionToken(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (!checkinUrl) return;
    navigator.clipboard.writeText(checkinUrl);
    toast.success("Link copiado!");
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement("a");
      a.download = "presenca-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/70 transition-all text-sm font-medium w-full justify-center"
      >
        <QrCode className="w-4 h-4" />
        Abrir QR Code para 2º secretário marcar presenças pelo celular
      </button>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">QR Code de Presença</span>
          {isCreating ? (
            <span className="flex items-center gap-1 text-xs text-amber-600 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Wifi className="w-3 h-3" /> Sincronizado
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        O 2º secretário escaneia com o celular e marca as presenças. Pode mudar de aba à vontade! ✨
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div ref={qrRef} className="p-3 bg-white rounded-xl border shadow-inner shrink-0 min-h-[174px] flex items-center justify-center">
          {sessionToken ? (
            <QRCodeSVG value={checkinUrl} size={150} level="M" includeMargin={false} />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/20" />
          )}
        </div>

        <div className="flex-1 space-y-2 w-full">
          <div className="text-sm">
            <span className="font-medium">{membrosPresentes.length}</span>
            <span className="text-muted-foreground"> presentes agora</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {membros.map((m) => (
              <span
                key={m.nome}
                className={`text-xs px-2 py-0.5 rounded-md border transition-all ${
                  membrosPresentes.includes(m.nome)
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-muted text-muted-foreground border-transparent"
                }`}
              >
                {membrosPresentes.includes(m.nome) ? "✓ " : ""}
                {m.nome.split(" ")[0]}
              </span>
            ))}
          </div>

          {/* Fotos de assinaturas enviadas pelo celular em tempo real */}
          {fotosAssinaturaUrls.length > 0 && (
            <div className="pt-2 border-t border-dashed border-muted">
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" /> 
                Folhas de Assinatura ({fotosAssinaturaUrls.length}):
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 max-w-[280px]">
                {fotosAssinaturaUrls.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    title="Clique para abrir imagem original"
                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 hover:opacity-85 transition-opacity shadow-sm bg-slate-50 flex items-center justify-center group"
                  >
                    <img src={url} alt={`Folha ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-md">
                      #{i + 1}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} disabled={!sessionToken} className="gap-1.5 text-xs">
              <Copy className="w-3 h-3" /> Copiar link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadQR} disabled={!sessionToken} className="gap-1.5 text-xs">
              <Download className="w-3 h-3" /> Baixar QR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
