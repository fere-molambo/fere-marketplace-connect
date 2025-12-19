-- Add missing columns to service_bookings for full booking flow
ALTER TABLE service_bookings 
  ADD COLUMN IF NOT EXISTS delivery_address_id uuid REFERENCES delivery_addresses(id),
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tva_amount numeric DEFAULT 0;

-- Add google_maps_link to delivery_addresses
ALTER TABLE delivery_addresses 
  ADD COLUMN IF NOT EXISTS google_maps_link text;

-- Create index for faster booking lookups
CREATE INDEX IF NOT EXISTS idx_service_bookings_date_service 
ON service_bookings(service_id, booking_date);

-- RLS policy for authenticated users to create their own bookings
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON service_bookings;
CREATE POLICY "Authenticated users can create bookings" 
ON service_bookings 
FOR INSERT 
WITH CHECK (auth.uid() = customer_id);