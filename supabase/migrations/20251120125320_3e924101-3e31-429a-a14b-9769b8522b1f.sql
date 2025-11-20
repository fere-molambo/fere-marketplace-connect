-- Policy pour permettre aux vendeurs de créer des membres équipe
CREATE POLICY "Les vendeurs peuvent créer des membres équipe"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'vendeur') AND role = 'equipe')
  OR
  has_role(auth.uid(), 'admin')
  OR
  has_role(auth.uid(), 'super_admin')
);

-- Policy pour que les admins peuvent modifier tous les profils
CREATE POLICY "Les admins peuvent modifier tous les profils"
ON profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- Policy pour que les utilisateurs peuvent upload leur propre avatar
CREATE POLICY "Les utilisateurs peuvent upload leur propre avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy pour que les admins peuvent upload n'importe quel avatar
CREATE POLICY "Les admins peuvent upload n'importe quel avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  )
);

-- Policy pour que tout le monde peut voir les avatars (bucket public)
CREATE POLICY "Les avatars sont publics"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');