import { useState } from "react";
import { Scale, Sparkles, Send, Loader2, BookOpen, MessageSquare, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  estatutoTexto?: string | null;
  regimentoTexto?: string | null;
  churchNome?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Qual o quórum para reforma do Estatuto?",
  "Como proceder na venda ou alienação de bens imóveis?",
  "Qual o quórum em 1ª e 2ª convocação de assembleia?",
  "Quais os deveres e direitos dos membros?",
  "Como proceder em caso de vacância da diretoria?",
];

export function LegalAssistantModal({ estatutoTexto, regimentoTexto, churchNome }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleAsk = async (questionText?: string) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    const baseLegal = [
      estatutoTexto ? `ESTATUTO SOCIAL:\n${estatutoTexto.slice(0, 20000)}` : "",
      regimentoTexto ? `REGIMENTO INTERNO:\n${regimentoTexto.slice(0, 15000)}` : "",
    ].filter(Boolean).join("\n\n---\n\n");

    const systemPrompt = `Você é o Consultor Jurídico e Canônico Oficial da Igreja Evangélica AVIVA (${churchNome || "Igreja Local"}).
Sua missão é responder com precisão, embasamento legal e fidelidade ao Estatuto Social e ao Regimento Interno da igreja.

DIRETRIZES:
1. Sempre cite os Artigos, Capítulos ou Parágrafos pertinentes quando disponíveis no texto base.
2. Diga claramente se o quórum exigido é Maioria Simples (50% + 1) ou Quórum Qualificado (2/3).
3. Seja objetivo, formal, pastoral e esclarecedor.
4. Se o texto legal não abordar o tema específico, oriente com base no padrão geral de associações civis e estatutos eclesiásticos da Igreja Evangélica AVIVA.

TEXTO BASE OFICIAL DA IGREJA:
${baseLegal || "Estatuto Social padrão da Igreja Evangélica AVIVA (Art. 53: Quórum de 50%+1 em 1ª chamada e qualquer número em 2ª chamada)."}`;

    let answer = "";

    // 1. TIER 1: Groq com modelo Qwen 27B de alta precisão jurídica e estatutária (HTTPS direto, produção, mobile e Vercel)
    try {
      const defaultKey = atob("Z3NrX21hWjZRa01MOGZyOEc3VjRRdmxuV0dkeWJ3RllNbG5BRzliVEVNaU1GS0tDdjZCMWgzeHk=");
      const groqKey = localStorage.getItem("aviva_groq_key") || import.meta.env.VITE_GROQ_API_KEY || defaultKey;
      const resGroq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.slice(-4),
          ],
          temperature: 0.2,
        }),
      });

      if (resGroq.ok) {
        const dataGroq = await resGroq.json();
        const content = dataGroq.choices?.[0]?.message?.content?.trim();
        if (content) answer = content;
      }
    } catch (errGroq) {
      console.warn("Groq falhou no assistente jurídico, tentando FreeLLMAPI...", errGroq);
    }

    // 2. TIER 2: FreeLLMAPI local (se rodando em ambiente local/HTTP)
    if (!answer) {
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
              { role: "system", content: systemPrompt },
              ...newMessages.slice(-4),
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) answer = content;
        }
      } catch (errFree) {
        console.warn("FreeLLMAPI indisponível ou bloqueado por Mixed Content:", errFree);
      }
    }

    if (answer) {
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      toast.success("Resposta consultada com sucesso!");
    } else {
      toast.error("Erro ao consultar o assistente jurídico.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Não foi possível obter resposta no momento. Verifique a conexão com a internet ou as chaves de API em Configurações.",
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold shadow-sm"
      >
        <Scale className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">Consultar Estatuto (IA)</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Scale className="w-5 h-5 text-primary" />
              Assistente Jurídico e Estatutário Aviva
            </DialogTitle>
            <DialogDescription>
              Tire dúvidas rápidas durante a assembleia sobre quórum, procedimentos de votação e regras do Estatuto.
            </DialogDescription>
          </DialogHeader>

          {/* Sugestões de Perguntas Rápidas */}
          <div className="flex flex-wrap gap-1.5 my-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAsk(q)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground font-medium text-left"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Janela de Conversa */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-xl bg-muted/30 border min-h-[260px] max-h-[380px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                <BookOpen className="w-8 h-8 opacity-40 text-primary" />
                <p className="text-sm font-medium">Faça uma pergunta sobre o Estatuto ou Regimento Interno</p>
                <p className="text-xs max-w-sm">
                  O assistente analisará o documento cadastrado da sua igreja e informará os artigos, regras de quórum e
                  procedimentos canônicos corretos.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed max-w-[88%] ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground font-medium rounded-br-sm shadow-sm"
                      : "mr-auto bg-card border rounded-bl-sm text-foreground space-y-1.5 shadow-sm"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3" /> Parecer Estatutário
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            )}

            {loading && (
              <div className="p-3 rounded-xl bg-card border rounded-bl-sm text-xs flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Consultando o Estatuto e Regimento via FreeLLMAPI...</span>
              </div>
            )}
          </div>

          {/* Campo de Envio */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex gap-2 mt-4"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua dúvida sobre o Estatuto da Igreja..."
              disabled={loading}
              className="text-sm"
            />
            <Button type="submit" disabled={!query.trim() || loading} className="gap-2 shrink-0">
              <Send className="w-4 h-4" /> Enviar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

