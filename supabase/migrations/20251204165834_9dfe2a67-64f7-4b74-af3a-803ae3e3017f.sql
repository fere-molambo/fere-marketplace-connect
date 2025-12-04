-- Add new columns to platform_settings for homepage customization
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS hero_cards JSONB DEFAULT '[
  {"image_url": "", "title": "Découvrez nos produits", "text": "Explorez une large gamme de produits de qualité", "button_text": "Voir les produits", "button_link": "/#products"},
  {"image_url": "", "title": "Services à la demande", "text": "Des prestations professionnelles à portée de main", "button_text": "Voir les services", "button_link": "/#services"},
  {"image_url": "", "title": "Rejoignez-nous", "text": "Devenez partenaire et développez votre activité", "button_text": "S inscrire", "button_link": "/auth"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS partner_logos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cta_pre_title TEXT DEFAULT 'Prêt à vous lancer ?',
ADD COLUMN IF NOT EXISTS cta_title TEXT DEFAULT 'Commencez dès maintenant gratuitement',
ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Profitez de 30 jours d''essai gratuit avec toutes les fonctionnalités. Commission de 10% uniquement sur vos ventes.',
ADD COLUMN IF NOT EXISTS cta_button_text TEXT DEFAULT 'Je m''inscris maintenant !',
ADD COLUMN IF NOT EXISTS cta_button_link TEXT DEFAULT '/auth',
ADD COLUMN IF NOT EXISTS cta_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS support_phone TEXT;

-- Create story_views table for tracking views
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.shop_stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS on story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert a view (for tracking)
CREATE POLICY "Anyone can record a story view"
ON public.story_views
FOR INSERT
WITH CHECK (true);

-- Policy: Shop owners and team can see views of their stories
CREATE POLICY "Shop managers can view story views"
ON public.story_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shop_stories ss
    JOIN public.shops s ON s.id = ss.shop_id
    WHERE ss.id = story_views.story_id
    AND (
      s.owner_id = auth.uid()
      OR is_shop_team_member(auth.uid(), s.id)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Policy: Public can view active public stories
CREATE POLICY "Public can view active public stories"
ON public.shop_stories
FOR SELECT
USING (
  is_active = true 
  AND expires_at > now() 
  AND visibility = 'public'::story_visibility
);

-- Policy: Public can view active products
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.shops WHERE id = products.shop_id AND is_active = true
  )
);

-- Policy: Public can view active services
CREATE POLICY "Public can view active services"
ON public.services
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.shops WHERE id = services.shop_id AND is_active = true
  )
);

-- Policy: Public can view active shops
CREATE POLICY "Public can view active shops"
ON public.shops
FOR SELECT
USING (is_active = true);