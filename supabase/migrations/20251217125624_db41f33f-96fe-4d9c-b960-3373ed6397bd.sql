-- Phase 1: Fix commission constraint
ALTER TABLE category_commissions DROP CONSTRAINT IF EXISTS category_or_service_type;
ALTER TABLE category_commissions ADD COLUMN IF NOT EXISTS commission_type text;

-- Phase 2: Add delivery settings to platform_settings
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS delivery_base_fee numeric DEFAULT 1000;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS delivery_fee_per_500m numeric DEFAULT 500;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS delivery_commission_fere numeric DEFAULT 15;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS delivery_commission_driver numeric DEFAULT 85;

-- Phase 3: Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text,
  geolocation_lat numeric,
  geolocation_lng numeric,
  assigned_admin_id uuid REFERENCES profiles(id),
  owner_type text DEFAULT 'fere',
  owner_name text,
  owner_contact text,
  contract_url text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouses" ON warehouses FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active warehouses" ON warehouses FOR SELECT
  USING (is_active = true);

-- Phase 4: Create warehouse_stock table
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouse stock" ON warehouse_stock FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view stock" ON warehouse_stock FOR SELECT
  USING (true);

-- Phase 5: Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'pending',
  
  delivery_type text NOT NULL,
  delivery_address_id uuid REFERENCES delivery_addresses(id),
  delivery_fee numeric DEFAULT 0,
  delivery_distance_meters integer,
  
  subtotal numeric NOT NULL,
  tva_amount numeric NOT NULL,
  commission_amount numeric NOT NULL,
  total_amount numeric NOT NULL,
  
  advance_percent numeric DEFAULT 100,
  advance_paid numeric DEFAULT 0,
  remaining_amount numeric DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'pending',
  payment_reference text,
  
  is_multi_vendor boolean DEFAULT false,
  source_warehouse_id uuid REFERENCES warehouses(id),
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON orders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON orders FOR SELECT 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage orders" ON orders FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Phase 6: Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  shop_id uuid REFERENCES shops(id) NOT NULL,
  
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  
  selected_color text,
  selected_size text,
  proposed_price numeric,
  
  vendor_status text DEFAULT 'pending',
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Users can create order items" ON order_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Vendors can view their order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = order_items.shop_id AND (shops.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), shops.id))));

CREATE POLICY "Vendors can update their order items" ON order_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = order_items.shop_id AND (shops.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), shops.id))));

CREATE POLICY "Admins can manage order items" ON order_items FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));
END;
$$;