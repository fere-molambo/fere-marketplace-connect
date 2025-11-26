-- Fix RLS policies for shop logo and banner storage
-- Drop and recreate policies with correct file path reference

-- Drop existing policies
DROP POLICY IF EXISTS "Vendors can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can delete shop images" ON storage.objects;

-- Recreate policies with correct syntax (using 'name' not 'shops.name')

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