import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um revisor de textos de atas eclesiásticas em português brasileiro. 
Sua tarefa é revisar o texto abaixo e retornar APENAS as correções necessárias em formato JSON.
Corrija erros de ortografia, concordância, pontuação e gramática.
NÃO altere nomes próprios, valores monetários, datas ou cargos.
NÃO altere o estilo ou reescreva frases — apenas corrija erros.
Retorne um JSON com a estrutura: { "correcoes": [{ "original": "trecho errado", "corrigido": "trecho correto", "motivo": "explicação breve" }], "texto_corrigido": "texto completo corrigido" }
Se não houver erros, retorne: { "correcoes": [], "texto_corrigido": "texto original" }`
          },
          { role: "user", content: texto }
        ],
        tools: [{
          type: "function",
          function: {
            name: "revisar_texto",
            description: "Retorna as correções encontradas no texto da ata",
            parameters: {
              type: "object",
              properties: {
                correcoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      original: { type: "string" },
                      corrigido: { type: "string" },
                      motivo: { type: "string" }
                    },
                    required: ["original", "corrigido", "motivo"]
                  }
                },
                texto_corrigido: { type: "string" }
              },
              required: ["correcoes", "texto_corrigido"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "revisar_texto" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content as JSON
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ correcoes: [], texto_corrigido: texto }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("verificar-texto error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
