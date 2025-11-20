-- Ajouter la colonne email à profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Mettre à jour le trigger handle_new_user pour inclure l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet, contact, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom_complet', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'contact', '+223'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Synchroniser les emails existants
UPDATE profiles p
SET email = (SELECT email FROM auth.users WHERE id = p.id)
WHERE email IS NULL;