
-- 1. Add new columns to service_bookings for the refactored workflow
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_type text, -- 'full', 'partial', 'cancelled_at_arrival'
  ADD COLUMN IF NOT EXISTS partial_payment_amount numeric,
  ADD COLUMN IF NOT EXISTS cancellation_reason_id uuid REFERENCES public.cancellation_reasons(id),
  ADD COLUMN IF NOT EXISTS cancellation_comment text,
  ADD COLUMN IF NOT EXISTS cancellation_proof_url text,
  ADD COLUMN IF NOT EXISTS vendor_dispute_comment text,
  ADD COLUMN IF NOT EXISTS balance_payment_reference text,
  ADD COLUMN IF NOT EXISTS balance_payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_cancel_at timestamptz;

-- 2. Force requires_booking = true for all existing services and set default
UPDATE public.services SET requires_booking = true WHERE requires_booking IS DISTINCT FROM true;
ALTER TABLE public.services ALTER COLUMN requires_booking SET DEFAULT true;

-- 3. Add RLS policy for clients to update their own bookings (for completion/cancellation)
CREATE POLICY "Clients can update their own bookings"
  ON public.service_bookings
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- 4. Add RLS policy for vendors/team to update bookings for their services
CREATE POLICY "Vendors and team can update bookings for their services"
  ON public.service_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN shops sh ON sh.id = s.shop_id
      WHERE s.id = service_bookings.service_id
      AND (sh.owner_id = auth.uid() OR is_shop_team_member(auth.uid(), sh.id))
    )
  );

-- 5. Create auto-expiration function (to be called by cron via edge function)
CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  expired_count integer := 0;
  booking_record RECORD;
BEGIN
  FOR booking_record IN
    SELECT id, customer_id, advance_paid, travel_fee, travel_fee_paid
    FROM service_bookings
    WHERE status = 'pending'
      AND auto_cancel_at IS NOT NULL
      AND auto_cancel_at < now()
  LOOP
    -- Update booking to expired
    UPDATE service_bookings
    SET status = 'expired', updated_at = now()
    WHERE id = booking_record.id;

    -- Create refund if advance was paid
    IF booking_record.travel_fee_paid = true AND booking_record.travel_fee > 0 THEN
      INSERT INTO refunds (
        user_id, booking_id, amount, net_refund,
        status, refund_status
      ) VALUES (
        booking_record.customer_id,
        booking_record.id,
        booking_record.travel_fee,
        booking_record.travel_fee,
        'pending',
        'pending_manual'
      );
    END IF;

    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$;
