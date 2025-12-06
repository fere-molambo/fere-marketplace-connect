-- Ajouter les enums pour les clients
CREATE TYPE client_sexe AS ENUM ('homme', 'femme', 'autre');
CREATE TYPE client_tranche_age AS ENUM ('18-25', '26-35', '36-45', '46-55', '55+');
CREATE TYPE client_statut_matrimonial AS ENUM ('celibataire', 'marie', 'divorce', 'veuf');
CREATE TYPE client_statut_professionnel AS ENUM ('etudiant', 'salarie', 'entrepreneur', 'sans_emploi', 'retraite');
CREATE TYPE client_piece_identite_type AS ENUM ('carte_etudiant', 'cni', 'passeport', 'permis_conduire');

-- Ajouter les colonnes au profil pour les clients
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sexe client_sexe;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tranche_age client_tranche_age;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statut_matrimonial client_statut_matrimonial;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statut_professionnel client_statut_professionnel;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS piece_identite_client_type client_piece_identite_type;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS piece_identite_client_url TEXT;

-- Table des adresses de livraison (max 3 par utilisateur géré côté application)
CREATE TABLE public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  country TEXT DEFAULT 'Mali',
  geolocation_lat NUMERIC,
  geolocation_lng NUMERIC,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);

-- Enable RLS
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent gérer leurs propres adresses
CREATE POLICY "Users can manage own addresses"
ON public.delivery_addresses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_delivery_addresses_updated_at
BEFORE UPDATE ON public.delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();