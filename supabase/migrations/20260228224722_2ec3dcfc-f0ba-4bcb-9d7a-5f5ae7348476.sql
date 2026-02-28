
-- 1. Creer une fonction SECURITY DEFINER pour verifier si un livreur est assigne a une commande
CREATE OR REPLACE FUNCTION public.is_driver_for_order(_driver_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery_requests
    WHERE order_id = _order_id AND driver_id = _driver_id
  );
$$;

-- 2. Creer une fonction pour verifier si un client est proprietaire d'une commande (pour delivery_requests)
CREATE OR REPLACE FUNCTION public.is_order_owner(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE id = _order_id AND user_id = _user_id
  );
$$;

-- 3. Remplacer la policy driver sur orders
DROP POLICY IF EXISTS "Drivers can update orders they deliver" ON orders;
CREATE POLICY "Drivers can update orders they deliver" ON orders
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'livreur'::app_role)
    AND is_driver_for_order(auth.uid(), id)
  );

-- 4. Remplacer les policies customer sur delivery_requests
DROP POLICY IF EXISTS "Customers can cancel their delivery requests" ON delivery_requests;
CREATE POLICY "Customers can cancel their delivery requests" ON delivery_requests
  FOR UPDATE
  USING (
    is_order_owner(auth.uid(), order_id)
    AND status NOT IN ('delivered', 'cancelled')
  )
  WITH CHECK (
    is_order_owner(auth.uid(), order_id)
  );

DROP POLICY IF EXISTS "Customers can view their delivery requests" ON delivery_requests;
CREATE POLICY "Customers can view their delivery requests" ON delivery_requests
  FOR SELECT
  USING (
    is_order_owner(auth.uid(), order_id)
  );
