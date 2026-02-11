
ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_status_check;

ALTER TABLE delivery_requests ADD CONSTRAINT delivery_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'assigned', 'in_progress', 'picked_up',
    'en_route_client', 'arrived', 'delivered', 'cancelled'
  ]));

ALTER TABLE delivery_requests DROP CONSTRAINT IF EXISTS delivery_requests_return_status_check;

ALTER TABLE delivery_requests ADD CONSTRAINT delivery_requests_return_status_check
  CHECK (return_status IS NULL OR return_status = ANY (ARRAY[
    'returning', 'en_route_vendor', 'arrived_vendor', 'returned'
  ]));
