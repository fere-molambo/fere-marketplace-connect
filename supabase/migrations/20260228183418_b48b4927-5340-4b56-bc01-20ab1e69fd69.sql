
-- =============================================
-- Table 1: device_tokens (push notification tokens)
-- =============================================
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
  ON public.device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Table 2: live_tracking_sessions (real-time GPS)
-- =============================================
CREATE TABLE public.live_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracker_role text NOT NULL CHECK (tracker_role IN ('driver', 'vendor', 'team')),
  reference_type text NOT NULL CHECK (reference_type IN ('delivery_request', 'service_booking')),
  reference_id uuid NOT NULL,
  current_lat double precision,
  current_lng double precision,
  heading double precision,
  speed double precision,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Tracker can manage their own sessions
CREATE POLICY "Trackers manage own sessions"
  ON public.live_tracking_sessions
  FOR ALL
  USING (auth.uid() = tracker_id)
  WITH CHECK (auth.uid() = tracker_id);

-- Clients can read tracking for their orders (delivery_request)
CREATE POLICY "Clients read delivery tracking"
  ON public.live_tracking_sessions
  FOR SELECT
  USING (
    reference_type = 'delivery_request'
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN orders o ON o.id = dr.order_id
      WHERE dr.id = live_tracking_sessions.reference_id
        AND o.user_id = auth.uid()
    )
  );

-- Clients can read tracking for their service bookings
CREATE POLICY "Clients read service tracking"
  ON public.live_tracking_sessions
  FOR SELECT
  USING (
    reference_type = 'service_booking'
    AND EXISTS (
      SELECT 1 FROM service_bookings sb
      WHERE sb.id = live_tracking_sessions.reference_id
        AND sb.customer_id = auth.uid()
    )
  );

-- Vendors can read tracking for deliveries of their shop orders
CREATE POLICY "Vendors read delivery tracking for their shops"
  ON public.live_tracking_sessions
  FOR SELECT
  USING (
    reference_type = 'delivery_request'
    AND EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN orders o ON o.id = dr.order_id
      JOIN shops s ON s.id = o.shop_id
      WHERE dr.id = live_tracking_sessions.reference_id
        AND (s.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), s.id))
    )
  );

-- Admins can read all
CREATE POLICY "Admins read all tracking"
  ON public.live_tracking_sessions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_live_tracking_updated_at
  BEFORE UPDATE ON public.live_tracking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_live_tracking_reference ON public.live_tracking_sessions (reference_type, reference_id) WHERE is_active = true;
CREATE INDEX idx_device_tokens_user ON public.device_tokens (user_id) WHERE is_active = true;

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tracking_sessions;
