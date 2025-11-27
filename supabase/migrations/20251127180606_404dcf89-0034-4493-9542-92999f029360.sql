-- Enable RLS on product-media bucket
CREATE POLICY "Vendors and team can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-media' AND
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

CREATE POLICY "Vendors and team can update product media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-media' AND
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

CREATE POLICY "Vendors and team can delete product media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-media' AND
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

CREATE POLICY "Anyone can view product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

-- Enable RLS on service-media bucket
CREATE POLICY "Vendors and team can upload service media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-media' AND
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

CREATE POLICY "Vendors and team can update service media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-media' AND
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

CREATE POLICY "Vendors and team can delete service media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-media' AND
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

CREATE POLICY "Anyone can view service media"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-media');