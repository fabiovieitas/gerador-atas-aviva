-- ==============================================================================
-- SCRIPT CONSOLIDADO DEFINITIVO: BANCO DE DADOS GERADOR DE ATAS AVIVA
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pnxssrrfgmmcxvrwzkvh/sql/new
-- ==============================================================================

-- 1. EXTENSÕES BÁSICAS (Com schema extensions e public)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

SET search_path = public, extensions;

-- 2. TIPO DE PERMISSÃO / CARGO (SE NÃO EXISTIR)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'user');
  END IF;
END $$;

-- 3. TABELAS CENTRAIS (CHURCHES, PROFILES, USER_ROLES, ATAS, INVITES)
CREATE TABLE IF NOT EXISTS public.churches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT DEFAULT 'RJ',
  estatuto_texto TEXT,
  regimento_texto TEXT,
  gemini_api_key TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.churches 
  ADD COLUMN IF NOT EXISTS estatuto_texto TEXT,
  ADD COLUMN IF NOT EXISTS regimento_texto TEXT,
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  church_id UUID REFERENCES public.churches(id),
  force_password_change BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  church_id UUID REFERENCES public.churches(id),
  role app_role NOT NULL DEFAULT 'user',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS public.atas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  dados_json JSONB,
  church_id UUID REFERENCES public.churches(id),
  created_by UUID,
  updated_by UUID REFERENCES auth.users(id),
  foto_assinatura_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.atas 
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS foto_assinatura_url TEXT;

-- 4. CRIAÇÃO DAS TABELAS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT DEFAULT 'Membro',
  genero TEXT CHECK (genero IN ('masculino', 'feminino')) DEFAULT 'masculino',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.official_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.assembly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.assembly_sessions(id) ON DELETE CASCADE,
  membro_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, membro_nome)
);

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

CREATE TABLE IF NOT EXISTS public.meeting_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  status TEXT DEFAULT 'agendada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  church_id UUID REFERENCES public.churches(id),
  action TEXT NOT NULL,
  details TEXT,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id),
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'aberto',
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  badge TEXT DEFAULT 'NOVO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- 5. FUNÇÕES AUXILIARES DE PAPEL
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'master')
  )
$$;

-- 6. HABILITAÇÃO DE RLS EM TODAS AS TABELAS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
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

-- 7. POLÍTICAS DE ACESSO (RLS)
DROP POLICY IF EXISTS "Churches: leitura autenticados" ON public.churches;
CREATE POLICY "Churches: leitura autenticados" ON public.churches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Churches: leitura anon" ON public.churches;
CREATE POLICY "Churches: leitura anon" ON public.churches FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Churches: gerenciamento master" ON public.churches;
CREATE POLICY "Churches: gerenciamento master" ON public.churches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Profiles: leitura proprio ou admin" ON public.profiles;
CREATE POLICY "Profiles: leitura proprio ou admin" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_master(auth.uid()));
DROP POLICY IF EXISTS "Profiles: update proprio" ON public.profiles;
CREATE POLICY "Profiles: update proprio" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Profiles: insert autenticado" ON public.profiles;
CREATE POLICY "Profiles: insert autenticado" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Profiles: leitura anon para setup" ON public.profiles;
CREATE POLICY "Profiles: leitura anon para setup" ON public.profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Roles: leitura proprio ou master" ON public.user_roles;
CREATE POLICY "Roles: leitura proprio ou master" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));
DROP POLICY IF EXISTS "Roles: gestao master" ON public.user_roles;
CREATE POLICY "Roles: gestao master" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

DROP POLICY IF EXISTS "Atas: leitura da igreja ou admin" ON public.atas;
CREATE POLICY "Atas: leitura da igreja ou admin" ON public.atas FOR SELECT TO authenticated USING (
  church_id IN (SELECT p.church_id FROM public.profiles p WHERE p.user_id = auth.uid()) OR public.is_admin_or_master(auth.uid())
);
DROP POLICY IF EXISTS "Atas: insercao autorizada" ON public.atas;
CREATE POLICY "Atas: insercao autorizada" ON public.atas FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    church_id IN (SELECT p.church_id FROM public.profiles p WHERE p.user_id = auth.uid()) OR public.is_admin_or_master(auth.uid())
  )
);
DROP POLICY IF EXISTS "Atas: update autor ou admin" ON public.atas;
CREATE POLICY "Atas: update autor ou admin" ON public.atas FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_admin_or_master(auth.uid()));
DROP POLICY IF EXISTS "Atas: delete admin" ON public.atas;
CREATE POLICY "Atas: delete admin" ON public.atas FOR DELETE TO authenticated USING (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Invites: leitura geral" ON public.invites;
CREATE POLICY "Invites: leitura geral" ON public.invites FOR SELECT USING (true);
DROP POLICY IF EXISTS "Invites: gestao admin" ON public.invites;
CREATE POLICY "Invites: gestao admin" ON public.invites FOR ALL TO authenticated USING (public.is_admin_or_master(auth.uid())) WITH CHECK (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Membros: leitura igreja" ON public.membros;
CREATE POLICY "Membros: leitura igreja" ON public.membros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Membros: escrita admin" ON public.membros;
CREATE POLICY "Membros: escrita admin" ON public.membros FOR ALL TO authenticated USING (public.is_admin_or_master(auth.uid())) WITH CHECK (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Pautas: acesso autenticados" ON public.pautas;
CREATE POLICY "Pautas: acesso autenticados" ON public.pautas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Docs: leitura publica" ON public.official_documents;
CREATE POLICY "Docs: leitura publica" ON public.official_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Docs: escrita autenticados" ON public.official_documents;
CREATE POLICY "Docs: escrita autenticados" ON public.official_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Sessions: acesso geral" ON public.assembly_sessions;
CREATE POLICY "Sessions: acesso geral" ON public.assembly_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Attendance: acesso geral" ON public.assembly_attendance;
CREATE POLICY "Attendance: acesso geral" ON public.assembly_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tasks: acesso autenticados" ON public.assembly_tasks;
CREATE POLICY "Tasks: acesso autenticados" ON public.assembly_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Schedule: acesso autenticados" ON public.meeting_schedule;
CREATE POLICY "Schedule: acesso autenticados" ON public.meeting_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Audit: acesso autenticados" ON public.audit_logs;
CREATE POLICY "Audit: acesso autenticados" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tickets: acesso autenticados" ON public.support_tickets;
CREATE POLICY "Tickets: acesso autenticados" ON public.support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "News: leitura livre" ON public.news;
CREATE POLICY "News: leitura livre" ON public.news FOR SELECT USING (true);
DROP POLICY IF EXISTS "News: escrita autenticada" ON public.news;
CREATE POLICY "News: escrita autenticada" ON public.news FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "User Sessions: acesso autenticados" ON public.user_sessions;
CREATE POLICY "User Sessions: acesso autenticados" ON public.user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. STORAGE (BUCKETS)
INSERT INTO storage.buckets (id, name, public) VALUES ('official_docs', 'official_docs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assinaturas_atas', 'assinaturas_atas', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Storage official_docs: leitura" ON storage.objects;
CREATE POLICY "Storage official_docs: leitura" ON storage.objects FOR SELECT USING (bucket_id = 'official_docs');
DROP POLICY IF EXISTS "Storage official_docs: upload" ON storage.objects;
CREATE POLICY "Storage official_docs: upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'official_docs');

DROP POLICY IF EXISTS "Storage assinaturas: leitura" ON storage.objects;
CREATE POLICY "Storage assinaturas: leitura" ON storage.objects FOR SELECT USING (bucket_id = 'assinaturas_atas');
DROP POLICY IF EXISTS "Storage assinaturas: upload" ON storage.objects;
CREATE POLICY "Storage assinaturas: upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assinaturas_atas');

-- 9. RPC FUNCTION: COMPLETE_REGISTRATION
CREATE OR REPLACE FUNCTION public.complete_registration(
  p_token UUID,
  p_user_id UUID,
  p_nome TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM public.invites WHERE token = p_token AND used = false AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  INSERT INTO public.profiles (user_id, nome, email, church_id, status)
  VALUES (p_user_id, p_nome, v_invite.email, v_invite.church_id, 'ativo')
  ON CONFLICT (user_id) DO UPDATE
  SET nome = p_nome, church_id = v_invite.church_id, status = 'ativo';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_invite.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.invites SET used = true WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. TRIGGER INTELIGENTE PARA NOVOS USUÁRIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_church_id UUID;
  v_is_first BOOLEAN;
BEGIN
  SELECT id INTO v_church_id FROM public.churches LIMIT 1;
  IF v_church_id IS NULL THEN
    v_church_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
    INSERT INTO public.churches (id, nome, cidade, estado)
    VALUES (v_church_id, 'Igreja Evangélica AVIVA - Matriz', 'Campos dos Goytacazes', 'RJ')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT (COUNT(*) = 0) INTO v_is_first FROM public.profiles;

  INSERT INTO public.profiles (user_id, nome, email, church_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_church_id,
    'ativo'
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET church_id = COALESCE(public.profiles.church_id, v_church_id),
      status = 'ativo';
  
  IF v_is_first OR NEW.email = 'fabiovieitas@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'master')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 11. DADOS INICIAIS (IGREJA MATRIZ + CRIAÇÃO / ATIVAÇÃO DO USUÁRIO MASTER)
-- 11.1 Garante Igreja Matriz sempre criada
INSERT INTO public.churches (id, nome, cidade, estado)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'Igreja Evangélica AVIVA - Matriz', 'Campos dos Goytacazes', 'RJ')
ON CONFLICT (id) DO NOTHING;

-- 11.2 Sincroniza qualquer usuário já existente em auth.users para Profiles e Master
DO $$
DECLARE
  v_church_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_rec RECORD;
BEGIN
  FOR v_rec IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    INSERT INTO public.profiles (user_id, nome, email, church_id, status)
    VALUES (
      v_rec.id, 
      COALESCE(v_rec.raw_user_meta_data->>'nome', split_part(v_rec.email, '@', 1)), 
      v_rec.email, 
      v_church_id, 
      'ativo'
    )
    ON CONFLICT (user_id) DO UPDATE 
    SET church_id = COALESCE(public.profiles.church_id, v_church_id),
        status = 'ativo';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_rec.id, 'master')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;

-- 11.3 Bloco protegido para criação/redefinição direta em auth.users
DO $$
DECLARE
  v_church_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_user_id UUID;
  v_pw_hash TEXT;
BEGIN
  BEGIN
    -- Tenta gerar hash com extensões disponíveis
    SELECT extensions.crypt('Aviva@2026', extensions.gen_salt('bf')) INTO v_pw_hash;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      SELECT public.crypt('Aviva@2026', public.gen_salt('bf')) INTO v_pw_hash;
    EXCEPTION WHEN OTHERS THEN
      v_pw_hash := NULL;
    END;
  END;

  IF v_pw_hash IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'fabiovieitas@gmail.com';

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      BEGIN
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
          'fabiovieitas@gmail.com', v_pw_hash, now(),
          '{"provider":"email","providers":["email"]}', '{"nome":"Fábio Vieitas"}',
          now(), now(), ''
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível inserir direto em auth.users: %', SQLERRM;
      END;
    ELSE
      UPDATE auth.users
      SET encrypted_password = v_pw_hash,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = v_user_id;
    END IF;

    -- Tenta inserir identidade
    BEGIN
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_user_id::text, v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', 'fabiovieitas@gmail.com'),
        'email', v_user_id::text,
        now(), now(), now()
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Vincula profile e role se o user existir
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.profiles (user_id, nome, email, church_id, status)
      VALUES (v_user_id, 'Fábio Vieitas', 'fabiovieitas@gmail.com', v_church_id, 'ativo')
      ON CONFLICT (user_id) DO UPDATE 
      SET church_id = v_church_id, status = 'ativo', nome = 'Fábio Vieitas';

      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'master')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END $$;
