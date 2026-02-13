
-- 1. Add new payment_type enum value for order_balance
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'order_balance';

-- 2. Add columns to orders table for advance/balance payment system
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_payment_reference text,
  ADD COLUMN IF NOT EXISTS balance_payment_status text DEFAULT 'pending';

-- 3. Replace handle_delivery_completed trigger function
-- Remove token deduction logic entirely
CREATE OR REPLACE FUNCTION public.handle_delivery_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  -- Only act when status changes to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.order_id IS NOT NULL THEN
    -- Get order info
    SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
    
    IF v_order.id IS NOT NULL THEN
      -- Mark order as fully paid and delivered
      UPDATE orders
      SET payment_status = 'paid',
          balance_payment_status = 'paid',
          status = 'delivered',
          updated_at = now()
      WHERE id = NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Update sync_order_payment_from_transaction to handle both advance and balance payments
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- Update order with balance payment info
      UPDATE orders
      SET 
        payment_status = 'paid',
        balance_payment_reference = NEW.reference,
        balance_payment_status = 'paid',
        updated_at = now()
      WHERE id = NEW.related_id;

      -- Mark delivery as delivered
      UPDATE delivery_requests
      SET 
        status = 'delivered',
        delivered_at = now(),
        updated_at = now()
      WHERE order_id = NEW.related_id 
        AND status = 'arrived'
        AND (is_return = false OR is_return IS NULL);

      -- Create pending payouts for vendor and driver
      -- Vendor payout: subtotal - commission
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

      -- Driver payout: driver_earnings from delivery_request
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
    
    -- Handle service booking payments
    IF NEW.payment_type = 'service_booking' AND NEW.related_id IS NOT NULL THEN
      UPDATE service_bookings
      SET 
        payment_status = 'paid',
        payment_reference = NEW.reference,
        advance_paid = NEW.amount,
        updated_at = now()
      WHERE id = NEW.related_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;
