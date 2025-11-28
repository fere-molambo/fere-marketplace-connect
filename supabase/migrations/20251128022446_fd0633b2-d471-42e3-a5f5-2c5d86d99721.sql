-- Add RLS policies for shop-stories storage bucket

-- INSERT: Vendors, team members, and admins can upload shop stories
CREATE POLICY "Vendors and team can upload shop stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-stories' AND
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id::text = (storage.foldername(name))[1]
    AND (
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- UPDATE: Vendors, team members, and admins can update shop stories
CREATE POLICY "Vendors and team can update shop stories"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-stories' AND
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id::text = (storage.foldername(name))[1]
    AND (
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- DELETE: Vendors, team members, and admins can delete shop stories
CREATE POLICY "Vendors and team can delete shop stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-stories' AND
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id::text = (storage.foldername(name))[1]
    AND (
      shops.owner_id = auth.uid() OR
      is_shop_team_member(auth.uid(), shops.id) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- SELECT: Public read access to shop stories
CREATE POLICY "Anyone can view shop stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-stories');