-- =============================================
-- Phase 1: Système d'annulation et paiements
-- =============================================

-- 1. Table des motifs d'annulation (admin-managed)
CREATE TABLE public.cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  applies_to text[] DEFAULT '{product,service}',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Policies: lecture publique, écriture admin
CREATE POLICY "Anyone can read active cancellation reasons"
  ON public.cancellation_reasons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage cancellation reasons"
  ON public.cancellation_reasons FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Données initiales
INSERT INTO public.cancellation_reasons (label, applies_to, display_order) VALUES
  ('Mauvais produit', '{product}', 1),
  ('Mauvaise qualité', '{product,service}', 2),
  ('Produit endommagé', '{product}', 3),
  ('Attente trop longue', '{product,service}', 4),
  ('J''ai changé d''avis', '{product,service}', 5),
  ('Client absent', '{product,service}', 6),
  ('Adresse introuvable', '{product}', 7),
  ('Incident de circulation', '{product}', 8),
  ('Autre', '{product,service}', 99);

-- 2. Table des annulations
CREATE TABLE public.cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  booking_id uuid REFERENCES public.service_bookings(id),
  cancelled_by uuid NOT NULL REFERENCES auth.users(id),
  canceller_role text NOT NULL CHECK (canceller_role IN ('client', 'driver', 'vendor', 'admin')),
  reason_id uuid REFERENCES public.cancellation_reasons(id),
  custom_reason text,
  attachment_url text,
  status_at_cancellation text NOT NULL,
  refund_amount numeric DEFAULT 0,
  penalty_amount numeric DEFAULT 0,
  delivery_fee_kept boolean DEFAULT false,
  requires_return boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  CONSTRAINT cancellation_has_reference CHECK (order_id IS NOT NULL OR booking_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own cancellations"
  ON public.cancellations FOR SELECT
  USING (
    cancelled_by = auth.uid() OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.service_bookings WHERE id = booking_id AND customer_id = auth.uid())
  );

CREATE POLICY "Users can create cancellations for their orders"
  ON public.cancellations FOR INSERT
  WITH CHECK (
    cancelled_by = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.service_bookings WHERE id = booking_id AND customer_id = auth.uid()) OR
      has_role(auth.uid(), 'livreur'::app_role) OR
      has_role(auth.uid(), 'vendeur'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Admins can update cancellations"
  ON public.cancellations FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Table des paiements en attente (escrow)
CREATE TABLE public.pending_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_type text NOT NULL CHECK (recipient_type IN ('vendor', 'driver')),
  order_id uuid REFERENCES public.orders(id),
  booking_id uuid REFERENCES public.service_bookings(id),
  delivery_request_id uuid REFERENCES public.delivery_requests(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'XOF',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'cancelled', 'failed')),
  paystack_transfer_code text,
  paystack_reference text UNIQUE,
  paystack_recipient_code text,
  eligible_at timestamptz,
  processed_at timestamptz,
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_payouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Recipients can view their own payouts"
  ON public.pending_payouts FOR SELECT
  USING (
    recipient_id = auth.uid() OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage payouts"
  ON public.pending_payouts FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Table des pénalités utilisateur
CREATE TABLE public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  cancellation_id uuid REFERENCES public.cancellations(id),
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived')),
  applied_to_order_id uuid REFERENCES public.orders(id),
  applied_to_booking_id uuid REFERENCES public.service_bookings(id),
  applied_at timestamptz,
  waived_by uuid REFERENCES auth.users(id),
  waived_at timestamptz,
  waived_reason text,
  blocks_cash_payment boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own penalties"
  ON public.user_penalties FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage penalties"
  ON public.user_penalties FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. Table des remboursements
CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  booking_id uuid REFERENCES public.service_bookings(id),
  cancellation_id uuid REFERENCES public.cancellations(id),
  amount numeric NOT NULL,
  transaction_fee_deducted numeric DEFAULT 0,
  net_refund numeric NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  paystack_refund_reference text,
  original_payment_reference text,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own refunds"
  ON public.refunds FOR SELECT
  USING (
    user_id = auth.uid() OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage refunds"
  ON public.refunds FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. Extensions à platform_settings
ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS cancellation_penalty_rate numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_cash_order_amount numeric DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS payout_delay_hours integer DEFAULT 24;

-- 7. Extensions à delivery_requests
ALTER TABLE public.delivery_requests 
  ADD COLUMN IF NOT EXISTS arrived_at_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_return boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_status text,
  ADD COLUMN IF NOT EXISTS original_delivery_id uuid REFERENCES public.delivery_requests(id);

-- Add check constraint for delivery_payment_status
ALTER TABLE public.delivery_requests 
  DROP CONSTRAINT IF EXISTS delivery_requests_delivery_payment_status_check;
ALTER TABLE public.delivery_requests 
  ADD CONSTRAINT delivery_requests_delivery_payment_status_check 
  CHECK (delivery_payment_status IS NULL OR delivery_payment_status IN ('pending', 'paid', 'unpaid'));

-- Add check constraint for return_status
ALTER TABLE public.delivery_requests 
  DROP CONSTRAINT IF EXISTS delivery_requests_return_status_check;
ALTER TABLE public.delivery_requests 
  ADD CONSTRAINT delivery_requests_return_status_check 
  CHECK (return_status IS NULL OR return_status IN ('en_route_vendor', 'arrived_vendor', 'returned'));

-- 8. Extensions à service_bookings
ALTER TABLE public.service_bookings 
  ADD COLUMN IF NOT EXISTS vendor_arrived_at timestamptz;

-- 9. Extensions à orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS cancellation_id uuid REFERENCES public.cancellations(id);

-- 10. Trigger pour updated_at sur pending_payouts
CREATE TRIGGER update_pending_payouts_updated_at
  BEFORE UPDATE ON public.pending_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();