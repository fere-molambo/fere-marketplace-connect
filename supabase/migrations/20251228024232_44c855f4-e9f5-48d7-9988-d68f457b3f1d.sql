-- Trigger to handle service booking completion: update payment status + deduct vendor tokens for cash payments
CREATE OR REPLACE FUNCTION public.handle_service_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vendor_id uuid;
  v_commission_amount numeric;
  v_already_deducted boolean;
BEGIN
  -- Only act when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- If payment method is cash, mark as paid
    IF NEW.payment_method = 'cash' AND NEW.payment_status != 'paid' THEN
      NEW.payment_status := 'paid';
    END IF;
    
    -- Get vendor (shop owner) from the service
    SELECT s.owner_id INTO v_vendor_id
    FROM services sv
    JOIN shops s ON s.id = sv.shop_id
    WHERE sv.id = NEW.service_id;
    
    -- Deduct Fere commission from vendor tokens (for cash payments)
    IF v_vendor_id IS NOT NULL AND NEW.payment_method = 'cash' THEN
      v_commission_amount := COALESCE(NEW.commission_amount, 0);
      
      IF v_commission_amount > 0 THEN
        -- Check if already deducted (idempotence)
        SELECT EXISTS(
          SELECT 1 FROM token_transactions 
          WHERE reference_type = 'service_booking' 
          AND reference_id = NEW.id
        ) INTO v_already_deducted;
        
        IF NOT v_already_deducted THEN
          -- Deduct tokens from vendor
          PERFORM deduct_tokens(
            v_vendor_id, 
            v_commission_amount::integer, 
            'service_booking', 
            NEW.id, 
            'Commission Fere sur service: ' || (SELECT name FROM services WHERE id = NEW.service_id)
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_service_booking_completed ON service_bookings;
CREATE TRIGGER on_service_booking_completed
  BEFORE UPDATE OF status ON service_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION handle_service_booking_completed();