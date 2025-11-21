-- Nettoyer les politiques RLS conflictuelles sur user_roles
DROP POLICY IF EXISTS "Les admins peuvent voir tous les rôles" ON user_roles;
DROP POLICY IF EXISTS "Admins et vendeurs peuvent voir tous les rôles" ON user_roles;

-- Créer une politique SELECT claire et unique pour les admins, super_admins et vendeurs
CREATE POLICY "Admins et vendeurs peuvent voir tous les rôles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'vendeur'::app_role)
);