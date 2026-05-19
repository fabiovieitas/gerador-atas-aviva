-- Migration: Add fotos_assinatura_urls to assembly_sessions & configure bucket
-- Created on: 2026-05-19

-- 1. Adicionar coluna fotos_assinatura_urls à tabela assembly_sessions
ALTER TABLE public.assembly_sessions ADD COLUMN IF NOT EXISTS fotos_assinatura_urls TEXT[] DEFAULT '{}';

-- 2. Garantir que a tabela assembly_sessions está na publicação realtime do Supabase para sincronização instantânea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'assembly_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assembly_sessions;
  END IF;
END $$;

-- 3. Criar/garantir a existência do bucket 'assinaturas_atas' para armazenamento dos arquivos de imagem
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas_atas', 'assinaturas_atas', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Definir políticas de RLS para o bucket 'assinaturas_atas'
-- Permitir leitura pública (para visualizar os comprovantes)
DROP POLICY IF EXISTS "Permitir leitura publica de assinaturas" ON storage.objects;
CREATE POLICY "Permitir leitura publica de assinaturas"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'assinaturas_atas' );

-- Permitir inserção pública (para enviar do celular sem obrigatoriedade de login ativo na sessão de marcação)
DROP POLICY IF EXISTS "Permitir upload publico de assinaturas" ON storage.objects;
CREATE POLICY "Permitir upload publico de assinaturas"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'assinaturas_atas' );

-- Permitir deleção para usuários autenticados
DROP POLICY IF EXISTS "Permitir delecao de assinaturas para autenticados" ON storage.objects;
CREATE POLICY "Permitir delecao de assinaturas para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'assinaturas_atas' );
