-- Créer le bucket pour les informations de la plateforme
INSERT INTO storage.buckets (id, name, public)
VALUES ('fere-dashboard-infos', 'fere-dashboard-infos', true);

-- RLS Policy : Lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'fere-dashboard-infos');

-- RLS Policy : Upload/Update pour super_admin et admin uniquement
CREATE POLICY "Super Admin and Admin can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fere-dashboard-infos' AND
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Super Admin and Admin can update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fere-dashboard-infos' AND
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Super Admin and Admin can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fere-dashboard-infos' AND
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
);

-- Table pour stocker les paramètres de la plateforme
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL DEFAULT 'Fere',
  app_description TEXT,
  logo_principal TEXT,
  logo_sidebar_collapsed TEXT,
  logo_auth_page TEXT,
  image_auth_login TEXT,
  image_auth_signup TEXT,
  favicon TEXT,
  cgu TEXT,
  cookies TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Un seul enregistrement de configuration
CREATE UNIQUE INDEX unique_platform_settings ON public.platform_settings ((true));

-- Insérer les valeurs par défaut
INSERT INTO public.platform_settings (
  app_name,
  app_description,
  image_auth_login,
  image_auth_signup
) VALUES (
  'Fere',
  'La plateforme qui connecte fournisseurs, prestataires de services et clients.',
  'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=1200&fit=crop',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=1200&fit=crop'
);

-- RLS : Lecture publique
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- RLS : Modification uniquement pour super_admin et admin
CREATE POLICY "Super Admin and Admin can update platform settings"
ON public.platform_settings FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
);