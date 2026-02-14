-- Fix: handle_delivery_completed should NOT mark order as paid/delivered for return deliveries
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
  -- SKIP return deliveries (is_return = true) — they should not change order payment/delivery status
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.order_id IS NOT NULL 
     AND (NEW.is_return = false OR NEW.is_return IS NULL) THEN
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

-- Also fix the current bad data: reset payment_status to partial for cancelled orders
UPDATE orders 
SET payment_status = 'partial', updated_at = now()
WHERE status = 'cancelled' AND payment_status = 'paid';