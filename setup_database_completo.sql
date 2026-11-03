-- ==============================================================================
-- SCRIPT CONSOLIDADO: SETUP COMPLETO DO BANCO DE DADOS GERADOR DE ATAS AVIVA
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard/project/pnxssrrfgmmcxvrwzkvh/sql)
-- ==============================================================================

-- 1. EXTENSÕES BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. AJUSTES NAS TABELAS JÁ EXISTENTES (COLUNAS ADICIONAIS NECESSÁRIAS)
ALTER TABLE public.churches 
  ADD COLUMN IF NOT EXISTS estatuto_texto TEXT,
  ADD COLUMN IF NOT EXISTS regimento_texto TEXT,
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

ALTER TABLE public.atas 
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS foto_assinatura_url TEXT;

-- 3. CRIAÇÃO DAS TABELAS DO SISTEMA QUE ESTÃO AUSENTES

-- 3.1. Tabela: membros (Cadastro de Membros da Igreja)
CREATE TABLE IF NOT EXISTS public.membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT DEFAULT 'Membro',
  genero TEXT CHECK (genero IN ('masculino', 'feminino')) DEFAULT 'masculino',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.2. Tabela: pautas (Planejamento de Pautas Prévias das Assembleias)
CREATE TABLE IF NOT EXISTS public.pautas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  titulo TEXT NOT NULL,
  data_prevista DATE,
  itens JSONB DEFAULT '[]'::jsonb,
  local_sugerido TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.3. Tabela: official_documents (Repositório de PDFs de Atas e Estatuto)
CREATE TABLE IF NOT EXISTS public.official_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.4. Tabela: assembly_sessions (Sessões de Presença Aberta via QR Code / Link)
CREATE TABLE IF NOT EXISTS public.assembly_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  titulo TEXT DEFAULT 'Presença em andamento',
  tipo TEXT DEFAULT 'Ata em elaboração',
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  church_nome TEXT,
  fotos_assinatura_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.5. Tabela: assembly_attendance (Marcação de Presença Nominal Instantânea)
CREATE TABLE IF NOT EXISTS public.assembly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.assembly_sessions(id) ON DELETE CASCADE,
  membro_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, membro_nome)
);

-- 3.6. Tabela: assembly_tasks (Matriz de Pendências / Deliberações da Ata)
CREATE TABLE IF NOT EXISTS public.assembly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  ata_id UUID REFERENCES public.atas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  data_limite DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.7. Tabela: meeting_schedule (Agenda de Reuniões e Assembleias)
CREATE TABLE IF NOT EXISTS public.meeting_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'agendada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.8. Tabela: audit_logs (Trilha de Auditoria das Ações)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.9. Tabela: support_tickets (Central de Suporte / Chamados dos Usuários)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  user_nome TEXT,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'aberto',
  reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.10. Tabela: news (Quadro de Novidades do Sistema)
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  author_credit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3.11. Tabela: user_sessions (Controle de Sessões e Segurança de Login)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================================================
-- 4. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ==============================================================================

ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pautas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 4.1. Membros: Autenticados podem gerenciar; Anônimos podem ler (para marcar presença via link)
DROP POLICY IF EXISTS "Membros: leitura autenticados" ON public.membros;
CREATE POLICY "Membros: leitura autenticados" ON public.membros FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Membros: leitura pública para checkin" ON public.membros;
CREATE POLICY "Membros: leitura pública para checkin" ON public.membros FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Membros: escrita autenticados" ON public.membros;
CREATE POLICY "Membros: escrita autenticados" ON public.membros FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.2. Pautas
DROP POLICY IF EXISTS "Pautas: acesso total autenticados" ON public.pautas;
CREATE POLICY "Pautas: acesso total autenticados" ON public.pautas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.3. Documentos Oficiais
DROP POLICY IF EXISTS "Official docs: leitura pública" ON public.official_documents;
CREATE POLICY "Official docs: leitura pública" ON public.official_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Official docs: escrita autenticados" ON public.official_documents;
CREATE POLICY "Official docs: escrita autenticados" ON public.official_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.4. Sessões de Presença (QR Code) - Leitura e criação pública/autenticada para fluidez
DROP POLICY IF EXISTS "Assembly Sessions: acesso geral" ON public.assembly_sessions;
CREATE POLICY "Assembly Sessions: acesso geral" ON public.assembly_sessions FOR ALL USING (true) WITH CHECK (true);

-- 4.5. Presença (assembly_attendance) - Permite qualquer um com link marcar/desmarcar
DROP POLICY IF EXISTS "Attendance: acesso geral" ON public.assembly_attendance;
CREATE POLICY "Attendance: acesso geral" ON public.assembly_attendance FOR ALL USING (true) WITH CHECK (true);

-- 4.6. Tarefas e Pendências
DROP POLICY IF EXISTS "Tasks: acesso autenticados" ON public.assembly_tasks;
CREATE POLICY "Tasks: acesso autenticados" ON public.assembly_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.7. Agenda de Reuniões
DROP POLICY IF EXISTS "Schedule: acesso autenticados" ON public.meeting_schedule;
CREATE POLICY "Schedule: acesso autenticados" ON public.meeting_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.8. Auditoria
DROP POLICY IF EXISTS "Audit: inserção livre e leitura autenticada" ON public.audit_logs;
CREATE POLICY "Audit: inserção livre e leitura autenticada" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.9. Suporte Tickets
DROP POLICY IF EXISTS "Tickets: acesso autenticados" ON public.support_tickets;
CREATE POLICY "Tickets: acesso autenticados" ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.10. Novidades
DROP POLICY IF EXISTS "News: leitura livre e escrita admin" ON public.news;
CREATE POLICY "News: leitura livre e escrita admin" ON public.news FOR SELECT USING (true);
CREATE POLICY "News: escrita autenticados" ON public.news FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4.11. Sessões de Usuário
DROP POLICY IF EXISTS "User Sessions: acesso autenticados" ON public.user_sessions;
CREATE POLICY "User Sessions: acesso autenticados" ON public.user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. REALTIME (Sincronização Instantânea em Telas e Celular)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'assembly_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assembly_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'assembly_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assembly_attendance;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'membros') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.membros;
  END IF;
END $$;

-- ==============================================================================
-- 6. STORAGE: CRIAÇÃO DOS BUCKETS E PERMISSÕES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('official_docs', 'official_docs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas_atas', 'assinaturas_atas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas Storage
DROP POLICY IF EXISTS "Storage official_docs: leitura publica" ON storage.objects;
CREATE POLICY "Storage official_docs: leitura publica" ON storage.objects FOR SELECT USING (bucket_id = 'official_docs');

DROP POLICY IF EXISTS "Storage official_docs: upload autenticado" ON storage.objects;
CREATE POLICY "Storage official_docs: upload autenticado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'official_docs');

DROP POLICY IF EXISTS "Storage assinaturas: leitura publica" ON storage.objects;
CREATE POLICY "Storage assinaturas: leitura publica" ON storage.objects FOR SELECT USING (bucket_id = 'assinaturas_atas');

DROP POLICY IF EXISTS "Storage assinaturas: upload publico" ON storage.objects;
CREATE POLICY "Storage assinaturas: upload publico" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assinaturas_atas');

-- ==============================================================================
-- 7. DADOS INICIAIS (Igreja Matriz Padrão)
-- ==============================================================================
INSERT INTO public.churches (id, nome, cidade, estado)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, 'Igreja Evangélica AVIVA - Matriz', 'Campos dos Goytacazes', 'RJ'
WHERE NOT EXISTS (SELECT 1 FROM public.churches);


