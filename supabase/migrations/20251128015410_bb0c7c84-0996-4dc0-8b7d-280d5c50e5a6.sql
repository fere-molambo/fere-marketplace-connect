-- Ajouter les colonnes pour les catégories et le négoce dans products
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES product_categories(id),
  ADD COLUMN IF NOT EXISTS min_auto_price numeric,
  ADD COLUMN IF NOT EXISTS auto_validation boolean DEFAULT true;

-- Ajouter les colonnes pour le négoce dans services
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS min_auto_price numeric,
  ADD COLUMN IF NOT EXISTS auto_validation boolean DEFAULT true;

-- Créer la table service_availability_slots pour les disponibilités
CREATE TABLE IF NOT EXISTS service_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_id, date, start_time)
);

-- Créer la table service_bookings pour les réservations
CREATE TABLE IF NOT EXISTS service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  slot_id uuid REFERENCES service_availability_slots(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES profiles(id),
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text DEFAULT 'pending',
  total_price numeric NOT NULL,
  advance_paid numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, booking_date, booking_time)
);

-- Mettre à jour les contraintes CHECK pour price_type
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_type_check;
ALTER TABLE products ADD CONSTRAINT products_price_type_check 
  CHECK (price_type IN ('unitaire', 'en_gros', 'negoce'));

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_price_type_check;
ALTER TABLE services ADD CONSTRAINT services_price_type_check 
  CHECK (price_type IN ('fixe', 'negoce'));

-- Activer RLS sur les nouvelles tables
ALTER TABLE service_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour service_availability_slots
CREATE POLICY "Shop owners and team can manage availability slots"
  ON service_availability_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_availability_slots.service_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        sh.owner_id = auth.uid() OR
        is_shop_team_member(auth.uid(), sh.id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_availability_slots.service_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        sh.owner_id = auth.uid() OR
        is_shop_team_member(auth.uid(), sh.id)
      )
    )
  );

CREATE POLICY "Users can view available slots"
  ON service_availability_slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_availability_slots.service_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        sh.owner_id = auth.uid() OR
        is_shop_team_member(auth.uid(), sh.id)
      )
    )
  );

-- Politiques RLS pour service_bookings
CREATE POLICY "Shop owners and team can manage bookings"
  ON service_bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_bookings.service_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        sh.owner_id = auth.uid() OR
        is_shop_team_member(auth.uid(), sh.id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_bookings.service_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        sh.owner_id = auth.uid() OR
        is_shop_team_member(auth.uid(), sh.id)
      )
    )
  );

CREATE POLICY "Customers can view their own bookings"
  ON service_bookings
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Trigger pour updated_at
CREATE TRIGGER update_service_bookings_updated_at
  BEFORE UPDATE ON service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();