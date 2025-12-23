-- Ajouter la colonne delivery_fee_per_km
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS delivery_fee_per_km numeric DEFAULT 200;

-- Migrer la valeur existante depuis delivery_fee_per_100m (si elle existe et non nulle)
-- Note: 100 FCFA/100m = 1000 FCFA/km, mais on normalise à 200 FCFA/km comme nouvelle valeur par défaut
UPDATE platform_settings 
SET delivery_fee_per_km = COALESCE(delivery_fee_per_100m * 10, 200)
WHERE delivery_fee_per_km IS NULL OR delivery_fee_per_km = 200;