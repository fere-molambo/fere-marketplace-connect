
-- Add blocking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES auth.users(id);

-- Add support fields to platform_settings (if not already present)
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'support@fere.app',
  ADD COLUMN IF NOT EXISTS support_phone text DEFAULT '+22300000000';
