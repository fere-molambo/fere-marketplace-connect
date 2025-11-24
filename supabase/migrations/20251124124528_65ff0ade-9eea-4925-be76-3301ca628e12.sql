-- Fonction utilitaire pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table pour les catégories et sous-catégories de produits
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_category_name UNIQUE(name, parent_id)
);

-- Index pour améliorer les performances des requêtes hiérarchiques
CREATE INDEX idx_product_categories_parent ON public.product_categories(parent_id);

-- Trigger pour updated_at
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
ON public.product_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Table pour les types de prestataires
CREATE TABLE public.service_provider_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Trigger pour updated_at
CREATE TRIGGER update_service_provider_types_updated_at
  BEFORE UPDATE ON public.service_provider_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour service_provider_types
ALTER TABLE public.service_provider_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active provider types"
ON public.service_provider_types FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage provider types"
ON public.service_provider_types FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Table pour les départements administratifs
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Trigger pour updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'vendeur')
);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Table de liaison entre utilisateurs et départements
CREATE TABLE public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_user_department UNIQUE(user_id, department_id)
);

-- RLS Policies pour user_departments
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their departments"
ON public.user_departments FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage user departments"
ON public.user_departments FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Ajouter la colonne department_id à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_department ON public.profiles(department_id);

-- Insertion de données initiales pour product_categories
INSERT INTO public.product_categories (name, parent_id, display_order) VALUES
  ('Téléphonie', NULL, 1),
  ('TV et Électroniques', NULL, 2),
  ('Électroménager', NULL, 3),
  ('Maison et Bureau', NULL, 4);

-- Sous-catégories de Téléphonie
INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Téléphones', id, 1 FROM public.product_categories WHERE name = 'Téléphonie' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Smartphones', id, 2 FROM public.product_categories WHERE name = 'Téléphonie' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Tablettes', id, 3 FROM public.product_categories WHERE name = 'Téléphonie' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Ordinateurs', id, 4 FROM public.product_categories WHERE name = 'Téléphonie' AND parent_id IS NULL;

-- Sous-catégories de TV et Électroniques
INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'TV', id, 1 FROM public.product_categories WHERE name = 'TV et Électroniques' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Audios et HiFi', id, 2 FROM public.product_categories WHERE name = 'TV et Électroniques' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Accessoires TV', id, 3 FROM public.product_categories WHERE name = 'TV et Électroniques' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Photos et Caméras', id, 4 FROM public.product_categories WHERE name = 'TV et Électroniques' AND parent_id IS NULL;

INSERT INTO public.product_categories (name, parent_id, display_order)
SELECT 'Jeux et Consoles', id, 5 FROM public.product_categories WHERE name = 'TV et Électroniques' AND parent_id IS NULL;

-- Insertion de données initiales pour service_provider_types
INSERT INTO public.service_provider_types (name, icon, display_order) VALUES
  ('Réparateur généraliste', 'Wrench', 1),
  ('Maçon', 'Hammer', 2),
  ('Plombier', 'Droplet', 3),
  ('Carreleur', 'Grid3x3', 4),
  ('Électricien', 'Zap', 5),
  ('Peintre', 'Paintbrush', 6),
  ('Frigoriste', 'Snowflake', 7),
  ('Mécanicien', 'Car', 8),
  ('Aide ménagère', 'Home', 9),
  ('Éducateur', 'GraduationCap', 10),
  ('Autres', 'MoreHorizontal', 99);

-- Insertion de données initiales pour departments
INSERT INTO public.departments (name, color, display_order) VALUES
  ('Direction', '#FF5733', 1),
  ('Ressources Humaines', '#33C3FF', 2),
  ('Comptabilité', '#33FF57', 3),
  ('Marketing', '#FF33F6', 4),
  ('Ventes', '#FFD700', 5),
  ('Logistique', '#8B4513', 6),
  ('Partenaires', '#4B0082', 7),
  ('Support et Relations Clients', '#FF6B6B', 8);