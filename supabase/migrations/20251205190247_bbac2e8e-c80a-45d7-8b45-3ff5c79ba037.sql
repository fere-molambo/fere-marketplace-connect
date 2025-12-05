-- Drop the overly permissive profile policy
DROP POLICY IF EXISTS "Users can view appropriate profiles" ON profiles;

-- Create more restrictive policies
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Vendors can view profiles of team members they created
CREATE POLICY "Vendors can view own team profiles" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'vendeur'::app_role) AND 
  created_by = auth.uid()
);

-- 4. Equipe members can view their own profile (already covered by policy 1)
-- But add explicit policy for equipe to view vendor who created them
CREATE POLICY "Equipe can view creator profile" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'equipe'::app_role) AND 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.created_by = profiles.id
  )
);