-- Create shops table
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo_url text,
  banner_url text,
  shop_type text NOT NULL CHECK (shop_type IN ('fournisseur', 'prestataire', 'les_deux')),
  statut_legal text CHECK (statut_legal IN ('particulier', 'entreprise')),
  address text,
  geolocation_lat numeric(10, 8),
  geolocation_lng numeric(11, 8),
  opening_time time,
  closing_time time,
  contact_phone text,
  contact_email text,
  support_phone text,
  whatsapp_catalog_link text,
  is_official boolean DEFAULT false,
  responsible_admin_id uuid REFERENCES public.profiles(id),
  verification_status text DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  creation_reason text,
  created_by uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shop_categories table
CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, category_id)
);

-- Create shop_service_types table
CREATE TABLE public.shop_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_type_id uuid NOT NULL REFERENCES public.service_provider_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, service_type_id)
);

-- Create shop_team_members table
CREATE TABLE public.shop_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_type text NOT NULL CHECK (assignment_type IN (
    'support-faq', 'community-management', 'marketing-vente', 
    'fidelisation', 'administration', 'autre'
  )),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  UNIQUE(shop_id, member_id)
);

-- Create shop_social_links table
CREATE TABLE public.shop_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN (
    'facebook', 'tiktok', 'instagram', 'snapchat', 'x', 'autre'
  )),
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, platform)
);

-- Create shop_stories table
CREATE TABLE public.shop_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL,
  source_type text DEFAULT 'upload' CHECK (source_type IN ('upload', 'link')),
  caption text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  includes text,
  main_media_url text,
  media_urls jsonb DEFAULT '[]'::jsonb,
  price_type text NOT NULL CHECK (price_type IN ('unitaire', 'en_gros')),
  price numeric(12, 2) NOT NULL,
  quantity_available int DEFAULT 0,
  min_quantity int DEFAULT 1,
  colors jsonb DEFAULT '[]'::jsonb,
  sizes jsonb DEFAULT '[]'::jsonb,
  product_type text CHECK (product_type IN ('fragile', 'lourd', 'inflammable', 'autre')),
  quantity_intervals jsonb DEFAULT '[]'::jsonb,
  discount_percent numeric(5, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  includes text,
  client_preparation text,
  main_media_url text,
  media_urls jsonb DEFAULT '[]'::jsonb,
  portfolio_link text,
  price_type text NOT NULL CHECK (price_type IN ('a_partir_de', 'fixe')),
  price numeric(12, 2) NOT NULL,
  requires_booking boolean DEFAULT false,
  booking_advance_percent numeric(5, 2) DEFAULT 0,
  weekly_availability jsonb DEFAULT '{}'::jsonb,
  discount_percent numeric(5, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is shop team member
CREATE OR REPLACE FUNCTION public.is_shop_team_member(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_team_members
    WHERE member_id = _user_id AND shop_id = _shop_id
  )
$$;

-- SHOPS RLS Policies
CREATE POLICY "Super admins and admins can view all shops"
ON public.shops FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Vendors can view their own shops"
ON public.shops FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Team members can view assigned shops"
ON public.shops FOR SELECT TO authenticated
USING (is_shop_team_member(auth.uid(), id));

CREATE POLICY "Super admins and admins can manage all shops"
ON public.shops FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Vendors can manage their own shops"
ON public.shops FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team members can update assigned shops"
ON public.shops FOR UPDATE TO authenticated
USING (is_shop_team_member(auth.uid(), id))
WITH CHECK (is_shop_team_member(auth.uid(), id));

-- SHOP_CATEGORIES RLS Policies
CREATE POLICY "Users can view shop categories based on shop access"
ON public.shop_categories FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_categories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage shop categories"
ON public.shop_categories FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_categories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_categories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- SHOP_SERVICE_TYPES RLS Policies
CREATE POLICY "Users can view shop service types based on shop access"
ON public.shop_service_types FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_service_types.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage shop service types"
ON public.shop_service_types FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_service_types.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_service_types.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- SHOP_TEAM_MEMBERS RLS Policies
CREATE POLICY "Users can view team members based on shop access"
ON public.shop_team_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_team_members.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage team members"
ON public.shop_team_members FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_team_members.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_team_members.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid()
    )
  )
);

-- Similar policies for shop_social_links, shop_stories, products, services
CREATE POLICY "Users can view based on shop access"
ON public.shop_social_links FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_social_links.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage"
ON public.shop_social_links FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_social_links.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_social_links.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- Shop stories policies
CREATE POLICY "Users can view stories based on shop access"
ON public.shop_stories FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_stories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage stories"
ON public.shop_stories FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_stories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_stories.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- Products policies
CREATE POLICY "Users can view products based on shop access"
ON public.products FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = products.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage products"
ON public.products FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = products.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = products.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- Services policies
CREATE POLICY "Users can view services based on shop access"
ON public.services FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = services.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

CREATE POLICY "Admins and shop owners can manage services"
ON public.services FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = services.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = services.shop_id
    AND (
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id)
    )
  )
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-banners', 'shop-banners', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop-stories', 'shop-stories', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

-- Add triggers for updated_at
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();