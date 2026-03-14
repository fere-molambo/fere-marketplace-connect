
-- =============================================================
-- Phase 1: Phone + PIN Authentication Tables
-- =============================================================

-- 1. pending_registrations
CREATE TABLE public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  role public.app_role NOT NULL,
  pin_hash text NOT NULL,
  otp_code text NOT NULL,
  otp_expires_at timestamptz NOT NULL,
  otp_attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- 2. user_pins
CREATE TABLE public.user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  internal_password text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- 3. login_attempts
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  attempts int DEFAULT 0,
  last_attempt_at timestamptz DEFAULT now(),
  blocked_until timestamptz
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 4. otp_rate_limits
CREATE TABLE public.otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  sent_at timestamptz DEFAULT now()
);
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_otp_rate_limits_phone_sent ON public.otp_rate_limits (phone, sent_at);

-- 5. pin_reset_requests
CREATE TABLE public.pin_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_by_admin uuid,
  processed_at timestamptz
);
ALTER TABLE public.pin_reset_requests ENABLE ROW LEVEL SECURITY;

-- Admin SELECT policy for pin_reset_requests (Phase 2 prep)
CREATE POLICY "Admins can view pin reset requests"
  ON public.pin_reset_requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Cleanup function for expired pending registrations
CREATE OR REPLACE FUNCTION public.cleanup_expired_registrations()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.pending_registrations WHERE otp_expires_at < now();
END;
$$;
