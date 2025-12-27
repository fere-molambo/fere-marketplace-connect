-- Étape 1: Activer REPLICA IDENTITY FULL pour le Realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_requests REPLICA IDENTITY FULL;

-- Étape 2: Ajouter les tables à la publication supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;

-- Étape 3: Créer la fonction de synchronisation orders.status depuis delivery_requests
CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total_requests int;
  v_delivered_count int;
  v_picked_up_count int;
  v_in_progress_count int;
  v_assigned_count int;
  v_new_status text;
BEGIN
  -- Récupérer l'order_id depuis le NEW record
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  
  -- Si pas d'order_id, on ne fait rien
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Compter les différents statuts des delivery_requests pour cette commande
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'picked_up'),
    COUNT(*) FILTER (WHERE status IN ('in_progress', 'started')),
    COUNT(*) FILTER (WHERE status = 'assigned')
  INTO v_total_requests, v_delivered_count, v_picked_up_count, v_in_progress_count, v_assigned_count
  FROM public.delivery_requests
  WHERE order_id = v_order_id;
  
  -- Si aucune delivery_request, on ne change pas le statut
  IF v_total_requests = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Déterminer le nouveau statut de la commande
  IF v_delivered_count = v_total_requests THEN
    -- Toutes les livraisons sont terminées
    v_new_status := 'delivered';
  ELSIF v_picked_up_count > 0 OR v_delivered_count > 0 THEN
    -- Au moins une livraison est en cours de transport
    v_new_status := 'in_transit';
  ELSIF v_in_progress_count > 0 OR v_assigned_count > 0 THEN
    -- Au moins une livraison est assignée ou en préparation
    v_new_status := 'confirmed';
  ELSE
    -- Statut par défaut (pending)
    v_new_status := 'pending';
  END IF;
  
  -- Mettre à jour le statut de la commande
  UPDATE public.orders
  SET status = v_new_status, updated_at = now()
  WHERE id = v_order_id AND status != v_new_status;
  
  RETURN NEW;
END;
$$;

-- Étape 4: Créer le trigger sur delivery_requests
DROP TRIGGER IF EXISTS trigger_sync_order_status ON public.delivery_requests;
CREATE TRIGGER trigger_sync_order_status
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_from_delivery();