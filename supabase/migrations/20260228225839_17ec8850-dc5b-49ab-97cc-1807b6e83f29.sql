
-- ============================================================
-- FIX 1: Modify trigger function to support INSERT (OLD is NULL)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act when status is 'success' and wasn't before (or on INSERT)
  IF NEW.status = 'success' AND (OLD IS NULL OR OLD.status != 'success') THEN
    
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

      -- Create vendor payout (only if not already existing)
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

      -- Create driver payout (only if not already existing)
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
    
    -- Handle service booking payments
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

-- ============================================================
-- FIX 2: Add AFTER INSERT trigger on payment_transactions
-- ============================================================
CREATE TRIGGER on_payment_transaction_insert
AFTER INSERT ON payment_transactions
FOR EACH ROW
WHEN (NEW.status = 'success')
EXECUTE FUNCTION sync_order_payment_from_transaction();

-- ============================================================
-- FIX 3: Insert missing payouts for existing orders
-- ============================================================

-- Order 906700ad (delivered): vendor payout = 3000 - 400 = 2600
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, eligible_at, status)
VALUES (
  '4671cff3-cfc0-42a8-a305-d49dbd70c388',
  'vendor',
  2600,
  '906700ad-1c18-4612-a40e-16c2a6336721',
  now(),
  'pending'
);

-- Order 906700ad (delivered): driver payout = 400
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, delivery_request_id, eligible_at, status)
VALUES (
  '325882a6-6aeb-4020-89e9-cd35c4fd2bab',
  'driver',
  400,
  '906700ad-1c18-4612-a40e-16c2a6336721',
  'e6c6a81d-a296-4c19-8328-bdb88f1ac4fd',
  now(),
  'pending'
);

-- Order 80f9ab47 (delivered): vendor payout = 1000 - 200 = 800
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, eligible_at, status)
VALUES (
  '4671cff3-cfc0-42a8-a305-d49dbd70c388',
  'vendor',
  800,
  '80f9ab47-7226-465e-9fe5-d37866513dc6',
  now(),
  'pending'
);

-- Order 80f9ab47 (delivered): driver payout = 400
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, delivery_request_id, eligible_at, status)
VALUES (
  '325882a6-6aeb-4020-89e9-cd35c4fd2bab',
  'driver',
  400,
  '80f9ab47-7226-465e-9fe5-d37866513dc6',
  '21bf4f8c-4148-4274-8d31-38d0ee6ef0e5',
  now(),
  'pending'
);

-- Order e0489b97 (cancelled after shipped): driver payout = 400 (compensation)
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, order_id, delivery_request_id, eligible_at, status)
VALUES (
  '325882a6-6aeb-4020-89e9-cd35c4fd2bab',
  'driver',
  400,
  'e0489b97-a98c-453b-8fae-2cbe1ce75af9',
  '44bc89d0-bc0f-4d6c-a454-3c6ea3c39cd3',
  now(),
  'pending'
);
