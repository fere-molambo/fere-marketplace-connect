-- 1. CRITICAL: Remove UPDATE policy on user_tokens that allows users to set arbitrary balance
DROP POLICY IF EXISTS "Users can update their own tokens via system" ON public.user_tokens;

-- 2. CRITICAL: Fix pending_payments - restrict to owner + admins
DROP POLICY IF EXISTS "Anyone can read pending payment by reference" ON public.pending_payments;

CREATE POLICY "Users can read own pending payments"
ON public.pending_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all pending payments"
ON public.pending_payments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. CRITICAL: Fix profiles - replace overly permissive messaging policy
DROP POLICY IF EXISTS "Authenticated users can view profiles for messaging" ON public.profiles;

CREATE POLICY "Users can view profiles they interact with"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE s.owner_id = auth.uid() AND o.user_id = profiles.id
  )
  OR (has_role(auth.uid(), 'vendeur'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'equipe'::app_role) AND is_created_by_profile(id))
  OR EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN orders o ON o.id = dr.order_id
    WHERE dr.driver_id = auth.uid() AND o.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE o.user_id = auth.uid() AND s.owner_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM delivery_requests dr
    JOIN orders o ON o.id = dr.order_id
    WHERE o.user_id = auth.uid() AND dr.driver_id = profiles.id
  )
);

-- Remove redundant policies now covered by the new comprehensive one
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Equipe can view creator profile" ON public.profiles;
DROP POLICY IF EXISTS "Vendors can view own team profiles" ON public.profiles;

-- 4. Fix is_shop_team_member() - add is_active filter
CREATE OR REPLACE FUNCTION public.is_shop_team_member(_user_id uuid, _shop_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_team_members
    WHERE member_id = _user_id AND shop_id = _shop_id AND is_active = true
  )
$$;

-- 5. Fix sync_order_status_from_delivery - add search_path
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

IF v_cancelled_count = v_total_requests THEN
v_new_status := 'cancelled';
ELSIF v_delivered_count = v_total_requests THEN
v_new_status := 'delivered';
ELSIF v_delivered_count + v_cancelled_count = v_total_requests AND v_delivered_count > 0 THEN
v_new_status := 'delivered';
ELSIF v_in_transit_count > 0 OR v_delivered_count > 0 THEN
v_new_status := 'shipped';
ELSIF v_confirmed_count > 0 THEN
v_new_status := 'confirmed';
ELSE
v_new_status := 'pending';
END IF;

UPDATE public.orders
SET status = v_new_status, updated_at = now()
WHERE id = v_order_id AND status != v_new_status;

RETURN NEW;
END;
$function$;