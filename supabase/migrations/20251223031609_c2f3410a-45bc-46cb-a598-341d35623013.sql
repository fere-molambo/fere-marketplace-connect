-- Add google_maps_link column to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS google_maps_link text;