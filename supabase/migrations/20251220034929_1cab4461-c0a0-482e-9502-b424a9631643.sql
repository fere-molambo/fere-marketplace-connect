-- Supprimer les tables entrepôts
DROP TABLE IF EXISTS warehouse_stock CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;

-- Créer la table des zones de livraison
CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text DEFAULT 'Mali',
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  radius_km numeric NOT NULL DEFAULT 5,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Trigger pour updated_at
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ajouter la zone à la boutique (une boutique = une zone)
ALTER TABLE shops 
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES delivery_zones(id);

-- Table des zones assignées aux livreurs (un livreur peut choisir plusieurs zones)
CREATE TABLE driver_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, zone_id)
);

-- Enrichir le profil livreur
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS driver_license_url text,
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_lat numeric,
  ADD COLUMN IF NOT EXISTS current_lng numeric,
  ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

-- Ajouter l'heure limite aux paramètres plateforme
ALTER TABLE platform_settings 
  ADD COLUMN IF NOT EXISTS max_delivery_acceptance_hour integer DEFAULT 18;

-- Politiques RLS pour les zones de livraison
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active zones" ON delivery_zones
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage zones" ON delivery_zones
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Politiques RLS pour driver_zones
ALTER TABLE driver_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their zones" ON driver_zones
  FOR ALL USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Admins can manage driver zones" ON driver_zones
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view their own zones" ON driver_zones
  FOR SELECT USING (driver_id = auth.uid());