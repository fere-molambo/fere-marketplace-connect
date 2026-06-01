CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  -- Only act when status is 'success' and wasn't before (or on INSERT)
  IF NEW.status = 'success' AND (OLD IS NULL OR OLD.status != 'success') THEN

    -- Handle advance payment (initial order payment)
    IF NEW.payment_type = 'order' AND NEW.related_id IS NOT NULL THEN
      -- Extract payment_group_id from metadata when available
      BEGIN
        v_group_id := NULLIF(NEW.metadata->>'payment_group_id','')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_group_id := NULL;
      END;

      IF v_group_id IS NOT NULL THEN
        -- Multi-vendor (or single): propagate to all orders sharing the same payment_group_id
        UPDATE orders
        SET
          payment_status = 'partial',
          payment_reference = NEW.reference,
          advance_paid = CASE WHEN id = NEW.related_id THEN NEW.amount ELSE COALESCE(advance_amount, advance_paid, 0) END,
          updated_at = now()
        WHERE payment_group_id = v_group_id
          AND payment_status NOT IN ('partial','paid');
      ELSE
        -- Legacy fallback: single order update
        UPDATE orders
        SET
          payment_status = 'partial',
          payment_reference = NEW.reference,
          advance_paid = NEW.amount,
          updated_at = now()
        WHERE id = NEW.related_id
          AND payment_status NOT IN ('partial','paid');
      END IF;
    END IF;

    -- Handle balance payment (second payment at delivery) — UNCHANGED
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
      WHERE o.id = NEW.related_id
        AND NOT EXISTS (
          SELECT 1 FROM pending_payouts pp
          WHERE pp.order_id = o.id AND pp.recipient_type = 'vendor'
        );

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
        AND (dr.is_return = false OR dr.is_return IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM pending_payouts pp
          WHERE pp.delivery_request_id = dr.id AND pp.recipient_type = 'driver'
        );
    END IF;

    -- Handle service booking payments — UNCHANGED
    IF NEW.payment_type = 'service_booking' AND NEW.related_id IS NOT NULL THEN
      IF (NEW.metadata->>'is_travel_fee')::boolean = true THEN
        UPDATE service_bookings
        SET
          payment_status = 'partial',
          travel_fee_paid = true,
          payment_reference = NEW.reference,
          advance_paid = NEW.amount,
          updated_at = now()
        WHERE id = NEW.related_id;
      ELSE
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
$function$;