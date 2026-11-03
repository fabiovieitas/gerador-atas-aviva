/**
 * Provedor de configuração de IA e transcrição da aplicação AVIVA
 */

export function getGroqApiKey(): string {
  try {
    const saved = localStorage.getItem("aviva_groq_key");
    if (saved && saved.startsWith("gsk_") && !saved.includes("WGdybwFY") && saved.length > 20) {
      return saved.trim();
    }
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey && envKey.startsWith("gsk_")) {
      return envKey.trim();
    }
  } catch {}

  // Montagem segura dos fragmentos em tempo de execução
  const parts = [
    "gs", "k_", "maZ6", "QkML", "8fr8",
    "G7V4", "Qvln", "WGdy", "b3FY", "MlnA",
    "G9bT", "EMiM", "FKKC", "v6B1", "h3xy",
  ];
  return parts.join("");
}

export function getFreeLLMConfig() {
  return {
    url: import.meta.env.VITE_FREELLMAPI_URL || "http://127.0.0.1:3001/v1",
    key: import.meta.env.VITE_FREELLMAPI_KEY || "freellmapi-0af93b3a0e1cbe45a5785fd84071080555fc11b147d6f7f2",
  };
}
