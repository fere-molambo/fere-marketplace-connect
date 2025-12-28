-- Extend the sync trigger to handle service_booking payments
CREATE OR REPLACE FUNCTION public.sync_order_payment_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status changes to 'success'
  IF NEW.status = 'success' AND OLD.status != 'success' THEN
    
    -- Handle order payments
    IF NEW.payment_type = 'order' AND NEW.related_id IS NOT NULL THEN
      UPDATE orders
      SET 
        payment_status = 'paid',
        payment_reference = NEW.reference,
        advance_paid = NEW.amount,
        updated_at = now()
      WHERE id = NEW.related_id;
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