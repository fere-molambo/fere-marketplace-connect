-- Créer une fonction helper pour product-media
CREATE OR REPLACE FUNCTION public.can_manage_product_media(_file_path text)
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

-- Créer une fonction helper pour service-media
CREATE OR REPLACE FUNCTION public.can_manage_service_media(_file_path text)
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

-- Supprimer les anciennes politiques défectueuses pour product-media
DROP POLICY IF EXISTS "Vendors and team can upload product media" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can update product media" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can delete product media" ON storage.objects;

-- Supprimer les anciennes politiques défectueuses pour service-media
DROP POLICY IF EXISTS "Vendors and team can upload service media" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can update service media" ON storage.objects;
DROP POLICY IF EXISTS "Vendors and team can delete service media" ON storage.objects;

-- Recréer les politiques pour product-media avec les fonctions helper
CREATE POLICY "Vendors and team can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media' AND can_manage_product_media(name));

CREATE POLICY "Vendors and team can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND can_manage_product_media(name));

CREATE POLICY "Vendors and team can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND can_manage_product_media(name));

-- Recréer les politiques pour service-media avec les fonctions helper
CREATE POLICY "Vendors and team can upload service media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-media' AND can_manage_service_media(name));

CREATE POLICY "Vendors and team can update service media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-media' AND can_manage_service_media(name));

CREATE POLICY "Vendors and team can delete service media"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-media' AND can_manage_service_media(name));