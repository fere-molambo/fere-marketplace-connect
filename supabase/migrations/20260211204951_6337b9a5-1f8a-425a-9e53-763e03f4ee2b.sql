
-- Fix: Add SECURITY DEFINER to sync_order_status_from_delivery so driver status updates
-- can propagate to the orders table without being blocked by RLS
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
  v_in_transit_count int;
  v_confirmed_count int;
  v_new_status text;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Compter les différents statuts (exclure les retours)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status IN ('picked_up', 'en_route_client', 'arrived')),
    COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress'))
  INTO v_total_requests, v_delivered_count, v_in_transit_count, v_confirmed_count
  FROM public.delivery_requests
  WHERE order_id = v_order_id AND (is_return = false OR is_return IS NULL);
  
  IF v_total_requests = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Déterminer le nouveau statut
  IF v_delivered_count = v_total_requests THEN
    v_new_status := 'delivered';
  ELSIF v_in_transit_count > 0 OR v_delivered_count > 0 THEN
    v_new_status := 'in_transit';
  ELSIF v_confirmed_count > 0 THEN
    v_new_status := 'confirmed';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Mettre à jour la commande
  UPDATE public.orders
  SET status = v_new_status, updated_at = now()
  WHERE id = v_order_id AND status != v_new_status;
  
  RETURN NEW;
END;
$function$;
