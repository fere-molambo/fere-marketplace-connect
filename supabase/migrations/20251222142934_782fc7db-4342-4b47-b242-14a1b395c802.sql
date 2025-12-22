-- Add new columns to delivery_zones for simplified zone creation
ALTER TABLE delivery_zones 
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS commune text,
  ADD COLUMN IF NOT EXISTS google_maps_link text;

-- Make center_lat and center_lng nullable since they'll be extracted from Google Maps link
ALTER TABLE delivery_zones 
  ALTER COLUMN center_lat DROP NOT NULL,
  ALTER COLUMN center_lng DROP NOT NULL;