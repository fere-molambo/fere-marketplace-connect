
CREATE OR REPLACE FUNCTION public.handle_service_booking_payout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_id uuid;
  v_vendor_amount numeric;
  v_already_exists boolean;
BEGIN
  -- Handle completed/partial bookings
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

  -- cancelled_at_arrival: NO payout for vendor (client keeps advance, vendor gets nothing)

  RETURN NEW;
END;
$function$;
