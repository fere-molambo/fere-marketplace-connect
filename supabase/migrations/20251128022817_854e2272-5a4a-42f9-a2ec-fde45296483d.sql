-- Create helper function for shop stories media management
CREATE OR REPLACE FUNCTION public.can_manage_story_media(_file_path text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops
    WHERE id::text = (storage.foldername(_file_path))[1]
    AND (
      owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), id) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );
$$;

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Vendors and team can upload shop stories" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can update shop stories" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can delete shop stories" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop stories" ON storage.objects;

-- Recreate policies using the helper function
CREATE POLICY "Vendors and team can upload shop stories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-stories' AND can_manage_story_media(name));

CREATE POLICY "Vendors and team can update shop stories"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-stories' AND can_manage_story_media(name));

CREATE POLICY "Vendors and team can delete shop stories"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-stories' AND can_manage_story_media(name));

CREATE POLICY "Anyone can view shop stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-stories');