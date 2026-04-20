-- Criar tabela de pautas
CREATE TABLE IF NOT EXISTS public.pautas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    titulo TEXT NOT NULL,
    data_prevista DATE,
    itens JSONB DEFAULT '[]'::jsonb,
    local_sugerido TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.pautas ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver pautas da sua igreja" ON public.pautas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND (church_id = pautas.church_id OR role = 'Master')
        )
    );

CREATE POLICY "Usuários podem criar pautas na sua igreja" ON public.pautas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND (church_id = pautas.church_id OR role = 'Master')
        )
    );

CREATE POLICY "Usuários podem editar pautas da sua igreja" ON public.pautas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND (church_id = pautas.church_id OR role = 'Master')
        )
    );

CREATE POLICY "Usuários podem deletar pautas da sua igreja" ON public.pautas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND (church_id = pautas.church_id OR role = 'Master')
        )
    );
