-- Criação do Bucket "official_docs" caso não exista
insert into storage.buckets (id, name, public)
values ('official_docs', 'official_docs', true)
on conflict (id) do nothing;

-- 1. Permitir que qualquer pessoa visualize/baixe os documentos oficiais (público)
create policy "Permitir leitura pública"
on storage.objects for select
using ( bucket_id = 'official_docs' );

-- 2. Permitir que usuários logados (secretários) façam upload de documentos
create policy "Permitir upload para usuarios autenticados"
on storage.objects for insert
with check ( 
  bucket_id = 'official_docs' 
  and auth.role() = 'authenticated' 
);

-- 3. Permitir que usuários logados excluam documentos
create policy "Permitir delete para usuarios autenticados"
on storage.objects for delete
using ( 
  bucket_id = 'official_docs' 
  and auth.role() = 'authenticated' 
);
