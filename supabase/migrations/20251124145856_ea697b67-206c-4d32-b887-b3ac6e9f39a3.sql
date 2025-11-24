-- Créer les types ENUM pour les nouveaux champs
CREATE TYPE statut_legal_type AS ENUM ('particulier', 'entreprise');
CREATE TYPE type_offre_type AS ENUM ('produits', 'services', 'les_deux');
CREATE TYPE piece_identite_type AS ENUM ('cni', 'passeport', 'permis');
CREATE TYPE type_contrat_type AS ENUM ('cdd', 'cdi', 'prestataire');
CREATE TYPE presence_type AS ENUM ('presentiel', 'distance', 'hybride');

-- Ajouter les colonnes à la table profiles
ALTER TABLE profiles 
  ADD COLUMN statut_legal statut_legal_type,
  ADD COLUMN type_offre type_offre_type,
  ADD COLUMN piece_identite_url text,
  ADD COLUMN piece_identite_type piece_identite_type,
  ADD COLUMN adresse text,
  ADD COLUMN geolocalisation_lat numeric(10, 8),
  ADD COLUMN geolocalisation_lng numeric(11, 8),
  ADD COLUMN type_contrat type_contrat_type,
  ADD COLUMN duree_contrat text,
  ADD COLUMN presence presence_type,
  ADD COLUMN contrat_url text;

-- Créer la table vendor_admins pour lier les vendeurs aux admins
CREATE TABLE vendor_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(vendor_id, admin_id)
);

-- Activer RLS sur vendor_admins
ALTER TABLE vendor_admins ENABLE ROW LEVEL SECURITY;

-- Policy : Super Admin et Admin peuvent tout gérer
CREATE POLICY "Admins can manage vendor-admin assignments"
ON vendor_admins FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy : Les vendeurs peuvent voir leurs admins assignés
CREATE POLICY "Vendors can view their assigned admins"
ON vendor_admins FOR SELECT
TO authenticated
USING (
  vendor_id = auth.uid() OR
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Créer les buckets de stockage
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false);

-- Policies pour identity-documents
CREATE POLICY "Users can view their identity documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'identity-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Users can upload their identity documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their identity documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policies pour contracts
CREATE POLICY "Admins can manage contracts"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'contracts' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'contracts' AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Users can view their contracts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy pour permettre aux vendeurs de modifier leurs propres informations
CREATE POLICY "Vendeurs peuvent modifier leurs propres informations"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id AND has_role(auth.uid(), 'vendeur'::app_role)
)
WITH CHECK (
  auth.uid() = id AND has_role(auth.uid(), 'vendeur'::app_role)
);