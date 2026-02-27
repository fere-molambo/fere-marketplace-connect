
-- Fix booking a45b28e7: correct payment_status and travel_fee_paid
UPDATE service_bookings
SET payment_status = 'partial', travel_fee_paid = true, updated_at = now()
WHERE id = 'a45b28e7-c7f7-4664-88f6-00f09aefef2c';

-- Create vendor payout for travel fee (100 FCFA)
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, booking_id, eligible_at)
SELECT '4671cff3-cfc0-42a8-a305-d49dbd70c388', 'vendor', 100, 'a45b28e7-c7f7-4664-88f6-00f09aefef2c', now() + interval '24 hours'
WHERE NOT EXISTS (
  SELECT 1 FROM pending_payouts WHERE booking_id = 'a45b28e7-c7f7-4664-88f6-00f09aefef2c' AND recipient_type = 'vendor'
);
