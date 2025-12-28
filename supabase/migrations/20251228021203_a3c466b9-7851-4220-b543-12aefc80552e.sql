-- Trigger to update order payment_status when payment_transactions becomes success
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a payment transaction succeeds for an order
  IF NEW.status = 'success' AND NEW.payment_type = 'order' AND NEW.related_id IS NOT NULL THEN
    UPDATE orders
    SET payment_status = 'paid', payment_reference = NEW.reference, updated_at = now()
    WHERE id = NEW.related_id AND payment_status != 'paid';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_transaction_update ON payment_transactions;
CREATE TRIGGER on_payment_transaction_update
  AFTER UPDATE OF status ON payment_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'success' AND OLD.status != 'success')
  EXECUTE FUNCTION sync_order_payment_from_transaction();

-- Trigger to handle cash delivery completion: update payment status + deduct driver tokens
CREATE OR REPLACE FUNCTION public.handle_delivery_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_all_delivered boolean;
  v_fere_commission numeric;
  v_already_deducted boolean;
BEGIN
  -- Only act when status changes to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.order_id IS NOT NULL THEN
    -- Get order info
    SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
    
    IF v_order.id IS NOT NULL THEN
      -- Check if all delivery requests for this order are delivered
      SELECT NOT EXISTS(
        SELECT 1 FROM delivery_requests 
        WHERE order_id = NEW.order_id AND status != 'delivered'
      ) INTO v_all_delivered;
      
      -- If all delivered and payment method is cash, mark as paid
      IF v_all_delivered AND v_order.payment_method = 'cash' THEN
        UPDATE orders
        SET payment_status = 'paid', updated_at = now()
        WHERE id = NEW.order_id AND payment_status != 'paid';
      END IF;
    END IF;
    
    -- Deduct Fere commission from driver tokens (for cash deliveries)
    IF NEW.driver_id IS NOT NULL AND NEW.delivery_fee IS NOT NULL AND NEW.driver_earnings IS NOT NULL THEN
      -- Commission = delivery_fee - driver_earnings
      v_fere_commission := NEW.delivery_fee - NEW.driver_earnings;
      
      IF v_fere_commission > 0 THEN
        -- Check if already deducted (idempotence)
        SELECT EXISTS(
          SELECT 1 FROM token_transactions 
          WHERE reference_type = 'delivery_request' 
          AND reference_id = NEW.id
        ) INTO v_already_deducted;
        
        IF NOT v_already_deducted THEN
          -- Deduct tokens from driver
          PERFORM deduct_tokens(
            NEW.driver_id, 
            v_fere_commission::integer, 
            'delivery_request', 
            NEW.id, 
            'Commission Fere sur livraison #' || NEW.id::text
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_delivery_completed ON delivery_requests;
CREATE TRIGGER on_delivery_completed
  AFTER UPDATE OF status ON delivery_requests
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION handle_delivery_completed();