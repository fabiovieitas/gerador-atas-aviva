import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Upload, Sparkles, Loader2, Play, Square, FileAudio, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  onApplyToAta: (dadosExtraidos: {
    assuntosPrincipais?: string;
    deliberacoes?: string[];
    palavraInicial?: string;
    textoCorrido?: string;
  }) => void;
}

export function AudioMeetingRecorder({ onApplyToAta }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [groqKey, setGroqKey] = useState<string>(() => localStorage.getItem("aviva_groq_key") || "");
  const [showGroqModal, setShowGroqModal] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o Web Speech API (suportado nativamente no Chrome, Edge, Safari e Opera)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript + " ";
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => prev + currentFinal);
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Permissão de microfone negada no navegador.");
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Se ainda deveria estar gravando, reconecta (evita pausas do browser)
        if (isRecording) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de fala nativo não suportado neste navegador. Use o envio de áudio gravado.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript("");
      toast.info("Gravação de voz pausada.");
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success("Gravando áudio da assembleia em tempo real...");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Upload de arquivo de áudio para Groq Whisper
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!groqKey) {
      setShowGroqModal(true);
      return;
    }

    setIsUploading(true);
    toast.info("Transcrevendo áudio via Groq Whisper Turbo...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "pt");
    formData.append("response_format", "json");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Erro ao transcrever áudio");
      }

      const data = await response.json();
      if (data.text) {
        setTranscript((prev) => (prev ? prev + "\n\n" : "") + data.text);
        toast.success("Áudio transcrito com sucesso pelo Whisper!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha no Whisper: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Sintetizar transcrição em texto formal de ata usando FreeLLMAPI
  const processarComIA = async () => {
    if (!transcript.trim()) {
      toast.error("Não há texto gravado ou transcrito para processar.");
      return;
    }

    setIsProcessingAI(true);
    toast.info("IA do FreeLLMAPI estruturando a ata a partir da transcrição...");

    const freeLlmUrl = import.meta.env.VITE_FREELLMAPI_URL || "http://127.0.0.1:3001/v1";
    const freeLlmKey = import.meta.env.VITE_FREELLMAPI_KEY || "freellmapi-0af93b3a0e1cbe45a5785fd84071080555fc11b147d6f7f2";

    const prompt = `Você é o Redator Jurídico e Secretário Oficial da Igreja Evangélica AVIVA.
Abaixo está a transcrição bruta do áudio de uma reunião/assembleia eclesiástica.
Sua missão é extrair e organizar as informações nos campos formais da ata:

Retorne um JSON rigoroso com a seguinte estrutura:
{
  "assuntosPrincipais": "Resumo objetivo e formal de 1 a 2 linhas dos assuntos debatidos",
  "palavraInicial": "Tema da mensagem pastoral ou reflexão inicial bíblica citada (se houver)",
  "deliberacoes": [
    "Texto formal da 1ª deliberação aprovada (ex: Aprovou-se por unanimidade a reforma do telhado...)",
    "Texto formal da 2ª deliberação..."
  ],
  "textoParagrafo": "Parágrafo formal completo e corrido dos acontecimentos para constar na ata."
}

TRANSCRIÇÃO DO ÁUDIO:
"""
${transcript}
"""`;

    try {
      const response = await fetch(`${freeLlmUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freeLlmKey}`,
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          messages: [
            { role: "system", content: "Você é um assistente que responde apenas em formato JSON válido." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error("Erro na resposta do FreeLLMAPI");

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);

      onApplyToAta({
        assuntosPrincipais: parsed.assuntosPrincipais,
        palavraInicial: parsed.palavraInicial,
        deliberacoes: parsed.deliberacoes || [],
        textoCorrido: parsed.textoParagrafo,
      });

      toast.success("Dados da transcrição aplicados na ata com sucesso!");
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao estruturar ata com IA.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2 px-4 py-2.5 text-sm border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
      >
        <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        Transcrever Reunião (Áudio/Voz)
      </Button>

      {/* Modal Principal do Gravador/Transcritor */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileAudio className="w-5 h-5 text-purple-600" />
              Transcritor Inteligente de Assembleias
            </DialogTitle>
            <DialogDescription>
              Grave a fala dos pastores ao vivo pelo microfone ou envie um arquivo de áudio gravado (.mp3, .m4a). A IA
              sintetiza e preenche a ata automaticamente!
            </DialogDescription>
          </DialogHeader>

          {/* Controles de Gravação */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={toggleRecording}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-current animate-pulse" /> Pausar Gravação Ao Vivo
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Gravar Microfone (Ao Vivo)
                  </>
                )}
              </Button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAudioUpload}
                accept="audio/*"
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Subir Áudio Gravado
              </Button>
            </div>

            {isRecording && (
              <Badge className="bg-red-500 text-white animate-pulse gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Ouvindo microfone...
              </Badge>
            )}
          </div>

          {/* Área de Visualização da Transcrição */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Texto Transcrito da Reunião
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(transcript);
                    toast.success("Texto copiado!");
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copiar Transcrição
                </button>
              )}
            </div>

            <Textarea
              value={transcript + (interimTranscript ? ` (${interimTranscript})` : "")}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="A transcrição das falas aparecerá aqui em tempo real enquanto a reunião acontece..."
              rows={8}
              className="font-mono text-xs leading-relaxed resize-none"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTranscript("");
                setInterimTranscript("");
              }}
              disabled={!transcript}
              className="text-xs"
            >
              Limpar Transcrição
            </Button>

            <Button
              onClick={processarComIA}
              disabled={!transcript.trim() || isProcessingAI}
              className="gap-2 bg-purple-700 hover:bg-purple-800 text-white shadow-md flex-1"
            >
              {isProcessingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sintetizando Ata com FreeLLMAPI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Estruturar Ata com IA Jurídica
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Chave Groq (opcional para arquivos longos) */}
      <Dialog open={showGroqModal} onOpenChange={setShowGroqModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chave Groq Whisper</DialogTitle>
            <DialogDescription>
              Para transcrever arquivos de áudio gravados com Whisper Turbo, informe sua chave gratuita da Groq (obtenha
              em console.groq.com):
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                localStorage.setItem("aviva_groq_key", groqKey);
                setShowGroqModal(false);
                toast.success("Chave salva localmente!");
              }}
            >
              Salvar e Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

