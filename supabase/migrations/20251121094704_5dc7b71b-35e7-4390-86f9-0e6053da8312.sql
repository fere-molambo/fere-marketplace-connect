-- Politique pour permettre aux admins de voir tous les rôles des utilisateurs
CREATE POLICY "Les admins peuvent voir tous les rôles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'vendeur')
);