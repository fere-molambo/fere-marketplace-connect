-- Ajouter une politique UPDATE pour permettre aux vendeurs de gérer les profils équipe
CREATE POLICY "Les vendeurs gèrent les profils équipe"
ON profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'vendeur'::app_role)
  AND has_role(id, 'equipe'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'vendeur'::app_role)
  AND has_role(id, 'equipe'::app_role)
);