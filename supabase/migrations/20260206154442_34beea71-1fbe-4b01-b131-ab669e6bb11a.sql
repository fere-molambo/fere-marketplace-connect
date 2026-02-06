
-- Update SELECT policy for drivers to handle NULL zone_id
DROP POLICY "Drivers can view requests in their zones" ON delivery_requests;
CREATE POLICY "Drivers can view requests in their zones"
ON delivery_requests FOR SELECT
USING (
  (
    (status = 'pending') AND (
      zone_id IN (
        SELECT zone_id FROM driver_zones
        WHERE driver_id = auth.uid() AND is_active = true
      )
      OR zone_id IS NULL
    )
  )
  OR (driver_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update UPDATE policy for drivers to handle NULL zone_id
DROP POLICY "Drivers can accept and update requests" ON delivery_requests;
CREATE POLICY "Drivers can accept and update requests"
ON delivery_requests FOR UPDATE
USING (
  (
    (status = 'pending') AND (
      zone_id IN (
        SELECT zone_id FROM driver_zones
        WHERE driver_id = auth.uid() AND is_active = true
      )
      OR zone_id IS NULL
    )
  )
  OR (driver_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix existing orphaned delivery requests with NULL zone_id
UPDATE delivery_requests dr
SET zone_id = o_shop.delivery_zone_id
FROM orders o
JOIN shops o_shop ON o_shop.id = o.shop_id
WHERE dr.order_id = o.id
  AND dr.zone_id IS NULL
  AND o_shop.delivery_zone_id IS NOT NULL;
