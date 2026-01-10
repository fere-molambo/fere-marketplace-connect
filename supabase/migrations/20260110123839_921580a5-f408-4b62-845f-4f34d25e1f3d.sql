-- Remove obsolete column from services table
ALTER TABLE public.services DROP COLUMN IF EXISTS booking_advance_percent;