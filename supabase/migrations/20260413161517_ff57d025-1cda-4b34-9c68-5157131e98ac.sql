
-- Create invites table
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  church_id UUID REFERENCES public.churches(id),
  role public.app_role NOT NULL DEFAULT 'user',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Masters can do everything with invites
CREATE POLICY "Masters can manage all invites"
ON public.invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Admins can create and view invites
CREATE POLICY "Admins can view invites they created"
ON public.invites FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND invited_by = auth.uid());

CREATE POLICY "Admins can create invites"
ON public.invites FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND role IN ('user', 'admin'));

-- Public can read invite by token (for registration page)
CREATE POLICY "Anyone can read invite by token"
ON public.invites FOR SELECT TO anon
USING (true);
