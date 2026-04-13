
-- Create atas table
CREATE TABLE public.atas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  dados_json JSONB,
  church_id UUID REFERENCES public.churches(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atas ENABLE ROW LEVEL SECURITY;

-- Users can view atas from their own church
CREATE POLICY "Users can view atas from their church"
ON public.atas FOR SELECT
TO authenticated
USING (
  church_id IN (
    SELECT p.church_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
  OR is_admin_or_master(auth.uid())
);

-- Users can create atas for their own church
CREATE POLICY "Users can create atas for their church"
ON public.atas FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    church_id IN (SELECT p.church_id FROM public.profiles p WHERE p.user_id = auth.uid())
    OR is_admin_or_master(auth.uid())
  )
);

-- Author or admin/master can update
CREATE POLICY "Author or admin can update atas"
ON public.atas FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR is_admin_or_master(auth.uid())
);

-- Only admin/master can delete
CREATE POLICY "Admin or master can delete atas"
ON public.atas FOR DELETE
TO authenticated
USING (is_admin_or_master(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_atas_updated_at
BEFORE UPDATE ON public.atas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.atas;
