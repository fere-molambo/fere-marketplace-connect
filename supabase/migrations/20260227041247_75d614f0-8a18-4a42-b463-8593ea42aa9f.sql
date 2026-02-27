
-- 1. Fix sync_order_payment_from_transaction: distinguish travel fee advance vs balance for service bookings
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only act when status changes to 'success'
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    
    -- Handle advance payment (initial order payment)
    IF NEW.payment_type = 'order' AND NEW.related_id IS NOT NULL THEN
      UPDATE orders
      SET 
        payment_status = 'partial',
        payment_reference = NEW.reference,
        advance_paid = NEW.amount,
        updated_at = now()
      WHERE id = NEW.related_id;
    END IF;

    -- Handle balance payment (second payment at delivery)
    IF NEW.payment_type = 'order_balance' AND NEW.related_id IS NOT NULL THEN
      UPDATE orders
      SET 
        payment_status = 'paid',
        balance_payment_reference = NEW.reference,
        balance_payment_status = 'paid',
        updated_at = now()
      WHERE id = NEW.related_id;

      UPDATE delivery_requests
      SET 
        status = 'delivered',
        delivered_at = now(),
        updated_at = now()
      WHERE order_id = NEW.related_id 
        AND status = 'arrived'
        AND (is_return = false OR is_return IS NULL);

      INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, eligible_at)
      SELECT 
        s.owner_id,
        'vendor',
        o.subtotal - o.commission_amount,
        o.id,
        now() + interval '24 hours'
      FROM orders o
      JOIN shops s ON s.id = o.shop_id
      WHERE o.id = NEW.related_id;

      INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, delivery_request_id, eligible_at)
      SELECT 
        dr.driver_id,
        'driver',
        dr.driver_earnings,
        dr.order_id,
        dr.id,
        now() + interval '24 hours'
      FROM delivery_requests dr
      WHERE dr.order_id = NEW.related_id 
        AND dr.driver_id IS NOT NULL
        AND (dr.is_return = false OR dr.is_return IS NULL);
    END IF;
    
    -- Handle service booking payments - distinguish travel fee advance vs balance
    IF NEW.payment_type = 'service_booking' AND NEW.related_id IS NOT NULL THEN
      IF (NEW.metadata->>'is_travel_fee')::boolean = true THEN
        -- Travel fee advance payment -> partial
        UPDATE service_bookings
        SET 
          payment_status = 'partial',
          travel_fee_paid = true,
          payment_reference = NEW.reference,
          advance_paid = NEW.amount,
          updated_at = now()
        WHERE id = NEW.related_id;
      ELSE
        -- Balance/completion payment -> paid
        UPDATE service_bookings
        SET 
          payment_status = 'paid',
          payment_reference = NEW.reference,
          updated_at = now()
        WHERE id = NEW.related_id;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Extend handle_service_booking_payout to handle cancelled_at_arrival
CREATE OR REPLACE FUNCTION public.handle_service_booking_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_vendor_id uuid;
  v_vendor_amount numeric;
  v_already_exists boolean;
BEGIN
  -- Handle completed/partial bookings (existing logic)
  IF (NEW.status IN ('completed', 'partial')) AND (OLD.status NOT IN ('completed', 'partial')) THEN

    SELECT sh.owner_id INTO v_vendor_id
    FROM services s
    JOIN shops sh ON sh.id = s.shop_id
    WHERE s.id = NEW.service_id;

    IF v_vendor_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM pending_payouts WHERE booking_id = NEW.id AND recipient_type = 'vendor'
    ) INTO v_already_exists;

    IF v_already_exists THEN
      RETURN NEW;
    END IF;

    v_vendor_amount := (COALESCE(NEW.total_price, 0) - COALESCE(NEW.commission_amount, 0))
                     + COALESCE(NEW.travel_fee, 0);

    IF v_vendor_amount > 0 THEN
      INSERT INTO pending_payouts (
        recipient_id, recipient_type, amount, booking_id, eligible_at
      ) VALUES (
        v_vendor_id, 'vendor', v_vendor_amount, NEW.id,
        now() + interval '24 hours'
      );
    END IF;
  END IF;

  -- Handle cancelled_at_arrival: vendor gets travel_fee only
  IF NEW.status = 'cancelled'
     AND NEW.completion_type = 'cancelled_at_arrival'
     AND OLD.status != 'cancelled'
     AND COALESCE(NEW.travel_fee, 0) > 0
  THEN
    SELECT sh.owner_id INTO v_vendor_id
    FROM services s
    JOIN shops sh ON sh.id = s.shop_id
    WHERE s.id = NEW.service_id;

    IF v_vendor_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM pending_payouts WHERE booking_id = NEW.id AND recipient_type = 'vendor'
      ) INTO v_already_exists;

      IF NOT v_already_exists THEN
        INSERT INTO pending_payouts (
          recipient_id, recipient_type, amount, booking_id, eligible_at
        ) VALUES (
          v_vendor_id, 'vendor', NEW.travel_fee, NEW.id,
          now() + interval '24 hours'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
