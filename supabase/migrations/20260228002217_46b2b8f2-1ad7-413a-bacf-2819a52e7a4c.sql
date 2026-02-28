DELETE FROM service_bookings 
WHERE id = '2e2c77d5-28a4-4c6e-abe2-4c27cd9c0194'
AND status = 'pending' 
AND travel_fee_paid = false 
AND payment_reference IS NULL;