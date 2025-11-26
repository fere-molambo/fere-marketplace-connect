-- Add RLS policies for shop image storage buckets

-- Policy: Public read access for shop images
CREATE POLICY "Shop images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id IN ('shop-logos', 'shop-banners'));

-- Policy: Vendors can upload images for their own shops
CREATE POLICY "Vendors can upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Policy: Team members can upload images for assigned shops
CREATE POLICY "Team members can upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND is_shop_team_member(auth.uid(), id)
  )
);

-- Policy: Vendors can update images for their own shops
CREATE POLICY "Vendors can update shop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Policy: Team members can update images for assigned shops
CREATE POLICY "Team members can update shop images"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND is_shop_team_member(auth.uid(), id)
  )
);

-- Policy: Vendors can delete images for their own shops
CREATE POLICY "Vendors can delete shop images"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Policy: Team members can delete images for assigned shops
CREATE POLICY "Team members can delete shop images"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id::text = (storage.foldername(name))[1]
    AND is_shop_team_member(auth.uid(), id)
  )
);

-- Policy: Admins can manage all shop images
CREATE POLICY "Admins can manage all shop images"
ON storage.objects FOR ALL
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);