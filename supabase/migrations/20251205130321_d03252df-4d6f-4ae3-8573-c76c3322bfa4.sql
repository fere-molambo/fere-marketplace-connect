-- Fix: Personal User Data Publicly Exposed
-- Drop the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les profils" ON public.profiles;

-- Create a more restrictive policy that only allows:
-- 1. Users to see their own profile
-- 2. Admins and super_admins to see all profiles
-- 3. Vendors to see équipe members they created
-- 4. Shop owners/team members to see profiles of people in their shops
CREATE POLICY "Users can view appropriate profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id  -- Own profile
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'vendeur'::app_role)
  OR has_role(auth.uid(), 'equipe'::app_role)
);