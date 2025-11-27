-- Add delivery and return policy fields to shops
ALTER TABLE shops 
ADD COLUMN delivery_details TEXT,
ADD COLUMN return_policy TEXT;

-- Add missing media fields to products
ALTER TABLE products 
ADD COLUMN hover_media_url TEXT,
ADD COLUMN video_url TEXT,
ADD COLUMN condition TEXT DEFAULT 'neuf' CHECK (condition IN ('neuf', '2eme_main'));

-- Add missing media fields to services
ALTER TABLE services 
ADD COLUMN hover_media_url TEXT,
ADD COLUMN video_url TEXT;

-- Add comments for clarity
COMMENT ON COLUMN shops.delivery_details IS 'Détails de livraison de la boutique';
COMMENT ON COLUMN shops.return_policy IS 'Politique de retour de la boutique';
COMMENT ON COLUMN products.condition IS 'État du produit: neuf ou 2ème main';
COMMENT ON COLUMN products.hover_media_url IS 'Image affichée au survol';
COMMENT ON COLUMN products.video_url IS 'URL de la vidéo du produit';
COMMENT ON COLUMN services.hover_media_url IS 'Image affichée au survol';
COMMENT ON COLUMN services.video_url IS 'URL de la vidéo de la prestation';