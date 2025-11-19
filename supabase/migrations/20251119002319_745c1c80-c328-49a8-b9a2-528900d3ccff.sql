-- Créer le bucket public pour les avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Politique RLS pour permettre aux utilisateurs de télécharger leur propre photo
CREATE POLICY "Les utilisateurs peuvent uploader leur avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politique pour que tout le monde puisse voir les avatars (bucket public)
CREATE POLICY "Tout le monde peut voir les avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Politique pour permettre aux utilisateurs de mettre à jour leur photo
CREATE POLICY "Les utilisateurs peuvent modifier leur avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Politique pour permettre aux utilisateurs de supprimer leur photo
CREATE POLICY "Les utilisateurs peuvent supprimer leur avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Créer l'enum pour les types d'utilisateurs
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin', 
  'partenaire',
  'livreur',
  'membre'
);

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  contact TEXT NOT NULL,
  photo_profil TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs authentifiés peuvent voir tous les profils
CREATE POLICY "Les utilisateurs peuvent voir les profils"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Politique: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Les utilisateurs peuvent modifier leur profil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Index pour optimiser les recherches
CREATE INDEX idx_profiles_contact ON public.profiles(contact);

-- Table des rôles utilisateurs
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction SECURITY DEFINER pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour obtenir tous les rôles d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Politique: Les utilisateurs peuvent voir leurs propres rôles
CREATE POLICY "Les utilisateurs peuvent voir leurs rôles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique: Seuls les super_admin et admin peuvent gérer les rôles
CREATE POLICY "Les admins peuvent gérer les rôles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Index pour optimiser les vérifications de rôles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet, contact)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom_complet', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'contact', '+223')
  );
  RETURN NEW;
END;
$$;

-- Trigger déclenché après la création d'un utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();