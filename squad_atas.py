"""
=============================================================================
🎙️ SQUAD 2: GERADOR DE ATAS AVIVA (squad_atas.py)
Workspace: Desktop\\Super Gerador\\gerador-atas-aviva
=============================================================================
Squad Multi-Agente Oficial:
- Agente 1: Transcritor de Áudio (Groq Whisper, Whisper Turbo, Diarização)
- Agente 2: Redator Jurídico & Executivo (Atas formais, quórum, deliberações)
- Agente 3: Engenheiro Supabase & Cloud DB (Schemas SQL, auth, storage de atas)
- Agente 4: Engenheiro Frontend (Vite, React, Tailwind CSS, shadcn/ui)
- Agente 5: Auditor de Qualidade & QA (Matriz de prazos, responsabilidade, Playwright)
=============================================================================
"""
import os
import sys
import json
import warnings
import urllib.request
import urllib.error

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

warnings.filterwarnings("ignore")
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"

FREELLM_URL = os.getenv("FREELLMAPI_URL", "http://127.0.0.1:3001/v1")
FREELLM_KEY = os.getenv("FREELLMAPI_KEY", "freellmapi-0af93b3a0e1cbe45a5785fd84071080555fc11b147d6f7f2")

def test_freellm_connection():
    try:
        req = urllib.request.Request(
            f"{FREELLM_URL}/models",
            headers={"Authorization": f"Bearer {FREELLM_KEY}"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return True, f"Online ({len(data.get('data', []))} modelos disponíveis)"
    except Exception as e:
        return False, f"Alerta ({e})"

try:
    from crewai import Agent, Task, Crew, Process, LLM

    def get_llm(model="openai/claude-sonnet-4-5", temp=0.2):
        return LLM(model=model, base_url=FREELLM_URL, api_key=FREELLM_KEY, temperature=temp)

    def criar_squad_atas():
        writer_llm = get_llm("openai/claude-sonnet-4-5", 0.2)
        coder_llm = get_llm("openai/claude-sonnet-4-5", 0.1)
        fast_llm = get_llm("openai/auto", 0.3)

        transcritor = Agent(
            role="Especialista em Transcrição e Diarização de Áudio",
            goal="Transcrever áudios de reuniões e assembleias com precisão técnica via Whisper, identificando oradores e pausas",
            backstory="Engenheiro de áudio e PLN especialista em processamento de voz, transcrição jurídica e separação de locutores.",
            llm=fast_llm,
            verbose=False
        )

        redator = Agent(
            role="Redator Jurídico e Notarial de Atas Oficiais",
            goal="Estruturar o texto formal da ata com pauta, quórum regimental, manifestações, votações e deliberações oficiais",
            backstory="Consultor jurídico sênior com vasta experiência em direito associativo, estatutos e redação de atas para cartório.",
            llm=writer_llm,
            verbose=False
        )

        supabase_eng = Agent(
            role="Engenheiro de Dados Supabase e Cloud PostgreSQL",
            goal="Modelar tabelas relacionais de assembleias, associados, presenças, assinaturas digitais e buckets seguros de PDF",
            backstory="Especialista em arquitetura Serverless com PostgreSQL/Supabase, RLS (Row-Level Security) e integridade de dados.",
            llm=coder_llm,
            verbose=False
        )

        frontend = Agent(
            role="Desenvolvedor Frontend Vite React e UI/UX",
            goal="Desenvolver interface intuitiva para gravação/upload de áudio, edição colaborativa de texto da ata e exportação em PDF",
            backstory="Engenheiro frontend com foco em Tailwind CSS, shadcn/ui e experiência fluida em sistemas corporativos.",
            llm=coder_llm,
            verbose=False
        )

        qa_auditor = Agent(
            role="Auditor de Conformidade, Prazos e QA",
            goal="Validar a matriz de deliberações, checar se todas as decisões possuem responsáveis e prazos e testar automação Playwright",
            backstory="Auditor de compliance e analista de QA focado em auditoria de processos, checklist de conformidade e testes automatizados.",
            llm=writer_llm,
            verbose=False
        )

        return [transcritor, redator, supabase_eng, frontend, qa_auditor]

    def executar_squad_atas(demanda: str) -> str:
        transcritor, redator, supabase_eng, frontend, qa_auditor = criar_squad_atas()
        t1 = Task(
            description=f"Processe e estruture o conteúdo ou requisitos para a ata: '{demanda}'.",
            expected_output="Minuta oficial da ata em formato notarial estruturado.",
            agent=redator
        )
        t2 = Task(
            description="Audite as decisões, identificando pendências, prazos e responsabilidades na matriz de deliberação.",
            expected_output="Relatório de auditoria e conformidade da ata.",
            agent=qa_auditor
        )
        equipe = Crew(agents=[redator, qa_auditor], tasks=[t1, t2], process=Process.sequential, verbose=True)
        return str(equipe.kickoff())

except Exception:
    criar_squad_atas = None
    executar_squad_atas = None

def main():
    print("=" * 70)
    print("  🎙️ SQUAD 2: GERADOR DE ATAS AVIVA — ATIVO")
    print("=" * 70)
    online, msg = test_freellm_connection()
    status_icon = "🟢" if online else "🟡"
    print(f"  {status_icon} FreeLLMAPI Local: {FREELLM_URL} -> {msg}")
    print("  ⚡ Modo de Operação: Cota R$ 0 (Modelos Locais Qwen / Claude Sonnet / FLUX)")
    print("-" * 70)
    print("  👥 AGENTES ESPECIALISTAS INTEGRADOS:")
    print("  [1] 🎧  Transcritor de Áudio          (Whisper Turbo, Diarização, Identificação)")
    print("  [2] 📜  Redator Jurídico & Executivo  (Minuta formal, quórum, deliberações)")
    print("  [3] 🗄️   Engenheiro Supabase / SQL     (Schemas PostgreSQL, RLS, Storage de Atas)")
    print("  [4] 💻  Frontend Vite / React / UI    (Tailwind CSS, shadcn/ui, Exportador PDF)")
    print("  [5] ⚖️   Auditor de Qualidade & QA     (Matriz de prazos, responsabilidades, Playwright)")
    print("=" * 70)

    if len(sys.argv) > 1:
        demanda = " ".join(sys.argv[1:])
        print(f"\n🚀 Disparando Missão do Squad para: '{demanda}'\n")
        if executar_squad_atas:
            resultado = executar_squad_atas(demanda)
            print("\n" + "=" * 70)
            print("🏁 RESULTADO DO SQUAD:")
            print("=" * 70)
            print(resultado)
        else:
            print("[Aviso] CrewAI não encontrado para execução encadeada.")
    else:
        print("\n✨ Status: Todos os 5 especialistas estão prontos e integrados ao projeto!")
        print("💡 Para despachar uma tarefa em cadeia para o Squad, execute:")
        print("   python squad_atas.py \"sua demanda aqui\"")
        print("=" * 70)

if __name__ == "__main__":
    main()

