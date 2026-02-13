
-- Fix the sync_order_status_from_delivery trigger to handle cancelled deliveries
CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_total_requests int;
  v_delivered_count int;
  v_cancelled_count int;
  v_in_transit_count int;
  v_confirmed_count int;
  v_new_status text;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count different statuses (exclude returns)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status IN ('picked_up', 'en_route_client', 'arrived')),
    COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress'))
  INTO v_total_requests, v_delivered_count, v_cancelled_count, v_in_transit_count, v_confirmed_count
  FROM public.delivery_requests
  WHERE order_id = v_order_id AND (is_return = false OR is_return IS NULL);
  
  IF v_total_requests = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Determine new status
  IF v_cancelled_count = v_total_requests THEN
    -- All deliveries cancelled -> order is cancelled
    v_new_status := 'cancelled';
  ELSIF v_delivered_count = v_total_requests THEN
    v_new_status := 'delivered';
  ELSIF v_delivered_count + v_cancelled_count = v_total_requests AND v_delivered_count > 0 THEN
    -- Mix of delivered and cancelled -> consider delivered
    v_new_status := 'delivered';
  ELSIF v_in_transit_count > 0 OR v_delivered_count > 0 THEN
    v_new_status := 'in_transit';
  ELSIF v_confirmed_count > 0 THEN
    v_new_status := 'confirmed';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Update order
  UPDATE public.orders
  SET status = v_new_status, updated_at = now()
  WHERE id = v_order_id AND status != v_new_status;
  
  RETURN NEW;
END;
$function$;

-- Fix the stuck order ORD-20260212-DCB804FD
UPDATE public.orders 
SET status = 'cancelled', updated_at = now()
WHERE id = 'de433f6d-468c-4950-be97-85e1b5124872' AND status = 'pending';

-- Create the missing refund for this order (subtotal=2000, delivery_fee=625)
INSERT INTO public.refunds (order_id, user_id, amount, net_refund, transaction_fee_deducted, original_payment_reference, status, refund_status)
VALUES (
  'de433f6d-468c-4950-be97-85e1b5124872',
  'fd028147-795e-496b-85fe-95cb968f5c68',
  2625,
  2000,
  625,
  'FERE_1770914038766_4rssn',
  'pending',
  'pending'
);
