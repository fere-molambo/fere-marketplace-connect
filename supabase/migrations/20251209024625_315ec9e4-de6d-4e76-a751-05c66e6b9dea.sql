-- Table pour stocker les images générées par l'IA
CREATE TABLE public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'gemini-2.5-flash-image',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Policy: Shop owners and team can manage generated images
CREATE POLICY "Shop owners and team can manage generated images"
ON public.generated_images
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = generated_images.shop_id
    AND (
      shops.owner_id = auth.uid()
      OR is_shop_team_member(auth.uid(), shops.id)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = generated_images.shop_id
    AND (
      shops.owner_id = auth.uid()
      OR is_shop_team_member(auth.uid(), shops.id)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true);

-- Storage policies for generated-images bucket
CREATE POLICY "Public can view generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

CREATE POLICY "Shop owners and team can upload generated images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images' 
  AND can_manage_shop_image(name)
);

CREATE POLICY "Shop owners and team can delete generated images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-images' 
  AND can_manage_shop_image(name)
);