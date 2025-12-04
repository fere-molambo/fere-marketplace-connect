-- Table ventes flash
CREATE TABLE public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  flash_price NUMERIC NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_product_or_service CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR 
    (product_id IS NULL AND service_id IS NOT NULL)
  )
);

-- RLS pour flash_sales
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active flash sales"
ON public.flash_sales FOR SELECT
USING (is_active = true AND ends_at > now());

CREATE POLICY "Shop owners and team can manage flash sales"
ON public.flash_sales FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = flash_sales.product_id
    AND (s.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), s.id) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM public.services sv
    JOIN public.shops s ON s.id = sv.shop_id
    WHERE sv.id = flash_sales.service_id
    AND (s.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), s.id) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = flash_sales.product_id
    AND (s.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), s.id) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM public.services sv
    JOIN public.shops s ON s.id = sv.shop_id
    WHERE sv.id = flash_sales.service_id
    AND (s.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), s.id) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Ajout durée aux services (en minutes)
ALTER TABLE public.services ADD COLUMN duration INTEGER;

-- Ajout liens produit/prestation aux stories
ALTER TABLE public.shop_stories ADD COLUMN linked_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.shop_stories ADD COLUMN linked_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Ajout guide/manuel aux shops
ALTER TABLE public.shops ADD COLUMN guide_url TEXT;
ALTER TABLE public.shops ADD COLUMN guide_name TEXT;

-- Bucket pour les guides
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-guides', 'shop-guides', true)
ON CONFLICT (id) DO NOTHING;

-- RLS pour shop-guides bucket
CREATE POLICY "Public can view shop guides"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-guides');

CREATE POLICY "Shop owners and team can manage guides"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-guides' AND
  can_manage_shop_image(name)
);

CREATE POLICY "Shop owners and team can update guides"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-guides' AND
  can_manage_shop_image(name)
);

CREATE POLICY "Shop owners and team can delete guides"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-guides' AND
  can_manage_shop_image(name)
);