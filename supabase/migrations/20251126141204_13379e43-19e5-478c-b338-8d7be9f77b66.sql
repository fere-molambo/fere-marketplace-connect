-- Helper function to decide if current user can manage a shop image based on file path
CREATE OR REPLACE FUNCTION public.can_manage_shop_image(_file_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shops
    WHERE id::text = (storage.foldername(_file_path))[1]
      AND (
        owner_id = auth.uid()
        OR is_shop_team_member(auth.uid(), id)
      )
  );
$$;

-- Clean up previous vendor / team policies if they exist
DROP POLICY IF EXISTS "Vendors can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete shop images" ON storage.objects;
DROP POLICY IF EXISTS "Team members can delete shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can update shop images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can delete shop images" ON storage.objects;

-- New unified policies for vendors and team members on shop logo & banner buckets
CREATE POLICY "Vendors and team can upload shop images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND public.can_manage_shop_image(name)
);

CREATE POLICY "Vendors and team can update shop images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND public.can_manage_shop_image(name)
);

CREATE POLICY "Vendors and team can delete shop images"
ON storage.objects
FOR DELETE
USING (
  bucket_id IN ('shop-logos', 'shop-banners')
  AND public.can_manage_shop_image(name)
);