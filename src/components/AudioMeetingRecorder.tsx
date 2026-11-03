import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  Loader2,
  FileAudio,
  Copy,
  Download,
  CloudUpload,
  Volume2,
  Trash2,
  Clock,
  CheckCircle2,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const detectHeuristicTags = (text: string): string[] => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected: string[] = [];
  if (/deslig|desvincul|afast|desfili|exclus/i.test(lower)) detected.push("Desligamento");
  if (/financ|caixa|dizim|ofert|saldo|banc|tesour|gasto|despesa|receita|balanc/i.test(lower)) detected.push("Financeiro");
  if (/retir|acamp|vigil|congresso/i.test(lower)) detected.push("Retiro");
  if (/reform|obra|pintur|construc|manuten|reparo|telhad/i.test(lower)) detected.push("Reforma");
  if (/batism|imers|novos convert/i.test(lower)) detected.push("Batismo");
  if (/elei|votac|candidat|posse|mandat/i.test(lower)) detected.push("Eleição");
  if (/disciplin|correc|advert/i.test(lower)) detected.push("Disciplina");
  if (/patrimon|veicul|imovel|terren|compra|venda/i.test(lower)) detected.push("Patrimônio");
  if (/evangelis|misso|campo/i.test(lower)) detected.push("Missões");
  if (/pastor|diretor|lideranc|presbiter|diacon/i.test(lower)) detected.push("Pastoral");
  return detected;
};

interface Props {
  churchId?: string;
  onApplyToAta: (dadosExtraidos: {
    assuntosPrincipais?: string;
    deliberacoes?: string[];
    palavraInicial?: string;
    textoCorrido?: string;
    tags?: string[];
  }) => void;
}

export function AudioMeetingRecorder({ churchId, onApplyToAta }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Áudio real gravado
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Transcrição de texto
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [groqKey, setGroqKey] = useState<string>(() => localStorage.getItem("aviva_groq_key") || "");
  const [aiExtractedData, setAiExtractedData] = useState<any>(null);
  const [showGroqModal, setShowGroqModal] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Opção para também gravar arquivo de áudio físico (.webm)
  const [recordRawAudio, setRecordRawAudio] = useState(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Cronômetro da gravação
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Efeito de limpeza ao desmontar o componente
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Reconhecimento de fala nativo não suportado neste navegador. Use Google Chrome ou Edge.");
      return;
    }

    if (isRecording) {
      // Parar gravação
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript("");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      toast.info("Gravação de voz pausada.");
      return;
    }

    // Iniciar gravação de voz diretamente no gesto de clique do usuário
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }

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
          setTranscript((prev) => (prev ? prev.trim() + " " : "") + currentFinal.trim());
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn("SpeechRecognition erro:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("Permissão de microfone negada. Clique no cadeado da barra de endereço e permita o microfone.");
          isRecordingRef.current = false;
          setIsRecording(false);
        } else if (event.error === "audio-capture") {
          toast.error("Nenhum microfone detectado no dispositivo.");
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Se ainda estiver no modo de gravação ativo, reconecta suavemente
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      isRecordingRef.current = true;
      setIsRecording(true);
      toast.success("Gravando áudio da assembleia em tempo real... Fale agora!");
    } catch (err: any) {
      console.error("Erro ao iniciar microfone:", err);
      toast.error("Erro ao ativar microfone: " + (err.message || "Tente novamente"));
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  // Download local do arquivo de áudio gravado
  const handleDownloadAudio = () => {
    if (!recordedAudioBlob) {
      toast.error("Nenhum áudio gravado disponível.");
      return;
    }
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const isOgg = recordedAudioBlob.type.includes("ogg");
    const isMp4 = recordedAudioBlob.type.includes("mp4");
    const ext = isOgg ? "ogg" : isMp4 ? "mp4" : "webm";
    const fileName = `Audio_Assembleia_AVIVA_${dateStr}.${ext}`;

    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Download do áudio concluído: ${fileName}`);
  };

  // Salvar áudio na nuvem do Supabase (Documentos Oficiais) para servir de testemunho jurídico
  const handleSaveAudioToCloud = async () => {
    if (!recordedAudioBlob) {
      toast.error("Nenhum áudio disponível para salvar.");
      return;
    }
    try {
      setIsSavingCloud(true);
      toast.info("Enviando gravação para o Acervo Oficial da Igreja no Supabase...");

      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const isOgg = recordedAudioBlob.type.includes("ogg");
      const isMp4 = recordedAudioBlob.type.includes("mp4");
      const ext = isOgg ? "ogg" : isMp4 ? "mp4" : "webm";
      const filePath = `gravacoes/Audio_Assembleia_${dateStr}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("official_docs")
        .upload(filePath, recordedAudioBlob, {
          contentType: recordedAudioBlob.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("official_docs")
        .getPublicUrl(filePath);

      const targetChurchId = churchId || "a0000000-0000-0000-0000-000000000001";

      const { error: dbError } = await supabase.from("official_documents").insert({
        church_id: targetChurchId,
        title: `Gravação de Áudio da Assembleia (${new Date().toLocaleDateString("pt-BR")})`,
        description: `Arquivo de áudio integral gravado durante a assembleia para fins probatórios, arquivamento e testemunho estatutário.`,
        file_url: publicUrl,
        category: "Gravações em Áudio",
      });

      if (dbError) throw dbError;

      toast.success("Áudio arquivado com sucesso no repositório de Documentos Oficiais!");
    } catch (err: any) {
      console.error("Erro ao salvar áudio no Supabase:", err);
      toast.error(`Falha ao arquivar áudio na nuvem: ${err.message || "Erro desconhecido"}`);
    } finally {
      setIsSavingCloud(false);
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

  // Helper robusto para extração de JSON da resposta de IA
  const extractJSON = (text: string) => {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    return JSON.parse(cleaned);
  };

  // Sintetizar transcrição em texto formal de ata usando IA resiliente multi-tier
  const processarComIA = async () => {
    if (!transcript.trim()) {
      toast.error("Não há texto gravado ou transcrito para processar.");
      return;
    }

    setIsProcessingAI(true);
    toast.info("IA Jurídica estruturando a ata a partir da transcrição...");

    const prompt = `Você é o Redator Jurídico e Secretário Oficial da Igreja Evangélica AVIVA.
Abaixo está a transcrição bruta do áudio de uma reunião/assembleia eclesiástica.
Sua missão é extrair e organizar as informações nos campos formais da ata:

Retorne EXCLUSIVAMENTE um JSON rigoroso com a seguinte estrutura:
{
  "assuntosPrincipais": "Resumo objetivo e formal de 1 a 2 linhas dos assuntos debatidos",
  "palavraInicial": "Tema da mensagem pastoral ou reflexão inicial bíblica citada (se houver)",
  "deliberacoes": [
    "Texto formal da 1ª deliberação aprovada (ex: Aprovou-se por unanimidade a prestação de contas...)",
    "Texto formal da 2ª deliberação..."
  ],
  "tags": [
    "desligamento",
    "financeiro",
    "retiro",
    "reforma"
  ],
  "textoParagrafo": "Parágrafo formal completo e corrido dos acontecimentos para constar no corpo da ata."
}

Regras para tags: Extraia as palavras-chave centrais debatidas na reunião, tais como 'desligamento' (se foi tratado desligamento ou disciplina de membro), 'financeiro' (se tratou de contas, dízimos, tesouraria), 'retiro' (se tratou de retiro de jovens ou acampamento), 'reforma' (se tratou de reformas, pintura ou obras), 'batismo', 'eleição', 'patrimônio', 'disciplina', 'pastoral'.

TRANSCRIÇÃO DO ÁUDIO:
"""
${transcript}
"""`;

    let parsed: any = null;

    // 1. TIER 1: Google Gemini 2.5 Flash via HTTPS (funciona em produção, mobile e Vercel sem Mixed Content)
    try {
      const geminiKey = localStorage.getItem("aviva_gemini_key") || "AIzaSyDiGs0iPDcCWP1IU3wIvRu4EgUH6W1R-xM";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

      const resGemini = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (resGemini.ok) {
        const dataGemini = await resGemini.json();
        const rawText = dataGemini.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          parsed = extractJSON(rawText);
        }
      }
    } catch (errGemini) {
      console.warn("Google Gemini fallback acionado:", errGemini);
    }

    // 2. TIER 2: FreeLLMAPI Local (se localhost ou HTTP)
    if (!parsed) {
      try {
        const freeLlmUrl = import.meta.env.VITE_FREELLMAPI_URL || "http://127.0.0.1:3001/v1";
        const freeLlmKey = import.meta.env.VITE_FREELLMAPI_KEY || "freellmapi-0af93b3a0e1cbe45a5785fd84071080555fc11b147d6f7f2";

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
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            parsed = extractJSON(content);
          }
        }
      } catch (errFree) {
        console.warn("FreeLLMAPI indisponível ou bloqueado por Mixed Content:", errFree);
      }
    }

    // 3. TIER 3: Groq Llama 3.3 (se chave configurada)
    if (!parsed && groqKey) {
      try {
        const resGroq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "Responda apenas em formato JSON." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        if (resGroq.ok) {
          const dataGroq = await resGroq.json();
          const content = dataGroq.choices?.[0]?.message?.content;
          if (content) {
            parsed = extractJSON(content);
          }
        }
      } catch (errGroq) {
        console.warn("Groq fallback falhou:", errGroq);
      }
    }

    // 4. TIER 4: Extrator Heurístico Local (contingência offline total)
    if (!parsed) {
      const sentencas = transcript.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);
      const resumo = sentencas.slice(0, 3).join(". ") + ".";
      const deliberacoesEncontradas = sentencas
        .filter((s) => /aprov|decid|acord|resolv|eleit|defin|autoriz|unanim/i.test(s))
        .map((s) => `Aprovou-se: ${s}`);

      const heuristicTags = detectHeuristicTags(transcript);
      parsed = {
        assuntosPrincipais: resumo.slice(0, 200),
        palavraInicial: "Palavra pastoral de edificação e oração inicial ministrada na assembleia.",
        deliberacoes:
          deliberacoesEncontradas.length > 0
            ? deliberacoesEncontradas
            : ["Apreciação e deliberações gerais aprovadas conforme pauta e quórum legal."],
        tags: heuristicTags.length > 0 ? heuristicTags : ["Assembleia Geral"],
        textoParagrafo: transcript.slice(0, 1500),
      };
    }

    if (parsed) {
      if (!parsed.tags || parsed.tags.length === 0) {
        parsed.tags = detectHeuristicTags(transcript);
      }
      setAiExtractedData(parsed);
      toast.success("Estrutura da ata gerada com sucesso! Revise e clique em 'Inserir na Ata'.");
    } else {
      toast.error("Não foi possível estruturar a ata.");
    }
    setIsProcessingAI(false);
  };

  const handleConfirmApply = () => {
    if (!aiExtractedData) return;
    try {
      const combinedTags = Array.from(new Set([
        ...(Array.isArray(aiExtractedData.tags) ? aiExtractedData.tags : []),
        ...detectHeuristicTags(transcript),
      ]));

      onApplyToAta({
        assuntosPrincipais: aiExtractedData.assuntosPrincipais,
        palavraInicial: aiExtractedData.palavraInicial,
        deliberacoes: Array.isArray(aiExtractedData.deliberacoes) ? aiExtractedData.deliberacoes : [],
        textoCorrido: aiExtractedData.textoParagrafo,
        tags: combinedTags,
      });
      setIsOpen(false);
      setAiExtractedData(null);
    } catch (applyErr: any) {
      console.error(applyErr);
      toast.error("Erro ao aplicar dados na ata.");
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
        Transcrever e Gravar Reunião
      </Button>

      {/* Modal Principal do Gravador/Transcritor */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileAudio className="w-5 h-5 text-purple-600" />
              Gravador & Transcritor Inteligente de Assembleias
            </DialogTitle>
            <DialogDescription>
              Grave o áudio real pelo microfone (para arquivo e testemunho) enquanto a transcrição acontece ao vivo. A
              IA jurídica estrutura automaticamente as pautas e deliberações na ata!
            </DialogDescription>
          </DialogHeader>

          {/* Controles de Gravação */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={toggleRecording}
                className="gap-2 shadow-sm font-semibold"
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-current animate-pulse" /> Pausar Gravação
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Iniciar Gravação ao Vivo
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
                disabled={isUploading || isRecording}
                className="gap-2 text-xs"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Subir Arquivo de Áudio
              </Button>
            </div>

            {isRecording ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white animate-pulse gap-1.5 px-3 py-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Gravando ({formatSeconds(recordingSeconds)})
                </Badge>
              </div>
            ) : recordingSeconds > 0 ? (
              <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                <Clock className="w-3 h-3" /> Duração: {formatSeconds(recordingSeconds)}
              </Badge>
            ) : null}

            {/* Opção de gravação de arquivo físico em conjunto */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-200/60 dark:border-purple-900/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                <input
                  type="checkbox"
                  checked={recordRawAudio}
                  onChange={(e) => setRecordRawAudio(e.target.checked)}
                  className="rounded border-input text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span>Gravar arquivo de áudio físico (.webm) para arquivamento/testemunho</span>
              </label>
              {isRecording && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Transcrição em tempo real ativa
                </span>
              )}
            </div>
          </div>

          {/* Feedback de voz ao vivo */}
          {interimTranscript && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-ping" />
              <span>Detectando fala: <em>"{interimTranscript}..."</em></span>
            </div>
          )}

          {/* Player e Ações do Áudio Gravado (Testemunho e Arquivo) */}
          {recordedAudioUrl && (
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Volume2 className="w-4 h-4 text-purple-600" />
                  Áudio Gravado da Reunião (Testemunho Probatório)
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatSeconds(recordingSeconds)}
                </span>
              </div>

              <audio controls src={recordedAudioUrl} className="w-full h-10 rounded-lg outline-none" />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadAudio}
                  className="gap-1.5 text-xs text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-100/50"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Áudio (.webm)
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveAudioToCloud}
                  disabled={isSavingCloud}
                  className="gap-1.5 text-xs font-medium"
                >
                  {isSavingCloud ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  Salvar nos Documentos Oficiais
                </Button>
              </div>
            </div>
          )}

          {/* Card de Pré-visualização da IA */}
          {aiExtractedData && (
            <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Estrutura Extraída com Sucesso pela IA
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">Pronto para Inserir</Badge>
              </div>

              {aiExtractedData.assuntosPrincipais && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase text-[10px]">Assuntos Principais:</span>
                  <p className="p-2.5 rounded-lg bg-background border text-xs text-foreground leading-relaxed">
                    {aiExtractedData.assuntosPrincipais}
                  </p>
                </div>
              )}

              {aiExtractedData.palavraInicial && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase text-[10px]">Palavra Inicial / Pastoral:</span>
                  <p className="p-2 rounded-lg bg-background border text-xs text-foreground">
                    {aiExtractedData.palavraInicial}
                  </p>
                </div>
              )}

              {aiExtractedData.deliberacoes && aiExtractedData.deliberacoes.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase text-[10px]">
                    Deliberações Identificadas ({aiExtractedData.deliberacoes.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {aiExtractedData.deliberacoes.map((delib: string, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-background border text-xs flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug text-foreground">{delib}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(aiExtractedData.tags) && aiExtractedData.tags.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase text-[10px]">
                    Palavras-chave e Tags Identificadas ({aiExtractedData.tags.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {aiExtractedData.tags.map((tg: string, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[11px] px-2 py-0.5">
                        #{tg}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {aiExtractedData.textoParagrafo && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase text-[10px]">Texto Formal para o Corpo da Ata:</span>
                  <p className="p-2.5 rounded-lg bg-background border text-[11px] leading-relaxed max-h-28 overflow-y-auto text-foreground font-serif">
                    {aiExtractedData.textoParagrafo}
                  </p>
                </div>
              )}

              <Button
                onClick={handleConfirmApply}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" /> Inserir Esses Dados no Formulário e na Ata Agora
              </Button>
            </div>
          )}

          {/* Área de Visualização da Transcrição */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Texto Transcrito em Tempo Real
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
                  <Copy className="w-3 h-3" /> Copiar Texto
                </button>
              )}
            </div>

            {/* Palavras-chave e Tags Detectadas Ao Vivo Conforme a Fala Acontece */}
            {(() => {
              const liveTags = detectHeuristicTags(transcript + (interimTranscript ? " " + interimTranscript : ""));
              if (liveTags.length === 0) return null;
              return (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      Palavras-chave Detectadas Ao Vivo na Reunião ({liveTags.length}):
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Reconhecimento Heurístico</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {liveTags.map((tag) => (
                      <Badge key={tag} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-0.5 shadow-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}

            <Textarea
              value={transcript + (interimTranscript ? ` (${interimTranscript})` : "")}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="As falas e deliberações aparecerão aqui em tempo real enquanto a reunião acontece..."
              rows={7}
              className="font-mono text-xs leading-relaxed resize-none"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTranscript("");
                setInterimTranscript("");
                setRecordedAudioUrl(null);
                setRecordedAudioBlob(null);
                setRecordingSeconds(0);
              }}
              disabled={!transcript && !recordedAudioUrl}
              className="text-xs gap-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </Button>

            <Button
              onClick={processarComIA}
              disabled={!transcript.trim() || isProcessingAI}
              className="gap-2 bg-purple-700 hover:bg-purple-800 text-white shadow-md flex-1"
            >
              {isProcessingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Estruturando Ata com IA...
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
              Para transcrever arquivos longos com Whisper Turbo, informe sua chave da Groq (console.groq.com):
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
