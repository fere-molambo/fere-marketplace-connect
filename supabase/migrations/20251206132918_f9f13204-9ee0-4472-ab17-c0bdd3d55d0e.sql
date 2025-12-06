-- Permettre à tous les utilisateurs authentifiés de voir les profils pour la messagerie
CREATE POLICY "Authenticated users can view profiles for messaging"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);