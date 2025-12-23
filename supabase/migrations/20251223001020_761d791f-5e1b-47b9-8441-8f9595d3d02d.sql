-- Ajouter les nouveaux champs de configuration de livraison
ALTER TABLE platform_settings 
  ADD COLUMN IF NOT EXISTS delivery_fee_per_100m numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS delivery_discount_per_km numeric DEFAULT 5;

-- Créer la table delivery_requests pour gérer les demandes de livraison
CREATE TABLE IF NOT EXISTS delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES delivery_zones(id),
  driver_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'picked_up', 'delivered', 'cancelled')),
  
  -- Points de récupération (vendeurs) avec ordre optimal
  pickup_points jsonb DEFAULT '[]',
  -- {shop_id, shop_name, lat, lng, address, pickup_order, distance_to_next}
  
  -- Point de livraison (client)
  delivery_point jsonb,
  -- {lat, lng, address, recipient_name, recipient_phone}
  
  -- Distances et frais
  total_distance_meters integer DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  driver_earnings numeric DEFAULT 0,
  
  -- Timestamps
  assigned_at timestamptz,
  started_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir leurs propres demandes via la commande
CREATE POLICY "Customers can view their delivery requests"
ON delivery_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = delivery_requests.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Les livreurs peuvent voir les demandes pending de leurs zones
CREATE POLICY "Drivers can view requests in their zones"
ON delivery_requests FOR SELECT
USING (
  (status = 'pending' AND zone_id IN (
    SELECT zone_id FROM driver_zones 
    WHERE driver_id = auth.uid() AND is_active = true
  ))
  OR driver_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Les livreurs peuvent accepter (update) les demandes pending de leurs zones
CREATE POLICY "Drivers can accept and update requests"
ON delivery_requests FOR UPDATE
USING (
  (status = 'pending' AND zone_id IN (
    SELECT zone_id FROM driver_zones 
    WHERE driver_id = auth.uid() AND is_active = true
  ))
  OR driver_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Seuls les admins peuvent créer des delivery_requests (via le checkout)
CREATE POLICY "Authenticated users can create delivery requests"
ON delivery_requests FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins peuvent tout supprimer
CREATE POLICY "Admins can delete delivery requests"
ON delivery_requests FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Trigger pour updated_at
CREATE TRIGGER update_delivery_requests_updated_at
  BEFORE UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_delivery_requests_order_id ON delivery_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_zone_id ON delivery_requests(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver_id ON delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);