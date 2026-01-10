-- Phase 1: Simplification du workflow de réservation de service

-- 1.1 Ajouter les champs frais de déplacement à services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS travel_fee_type text DEFAULT 'free' CHECK (travel_fee_type IN ('free', 'paid')),
ADD COLUMN IF NOT EXISTS travel_fee_amount numeric DEFAULT 0;

-- 1.2 Ajouter les nouveaux champs à service_bookings
ALTER TABLE service_bookings
ADD COLUMN IF NOT EXISTS travel_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS travel_fee_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_on_the_way_at timestamptz;

-- 1.3 Migrer les anciens statuts vers les nouveaux
UPDATE service_bookings SET status = 'reserved' WHERE status IN ('pending', 'confirmed');
UPDATE service_bookings SET status = 'on_the_way' WHERE status = 'in_progress';

-- 1.4 Index pour performance
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_vendor_on_the_way ON service_bookings(vendor_on_the_way_at) WHERE vendor_on_the_way_at IS NOT NULL;