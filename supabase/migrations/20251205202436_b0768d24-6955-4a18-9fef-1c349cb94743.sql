-- Create SECURITY DEFINER function to check if current user was created by a specific profile
-- This avoids infinite recursion by bypassing RLS policies
CREATE OR REPLACE FUNCTION public.is_created_by_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.created_by = _profile_id
  )
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Equipe can view creator profile" ON public.profiles;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Equipe can view creator profile"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'equipe'::app_role) 
  AND is_created_by_profile(id)
);