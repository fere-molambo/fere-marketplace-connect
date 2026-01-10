-- ==============================================
-- Migration: Simplification des commandes (1 commande = 1 vendeur)
-- ==============================================

-- 1. Ajouter payment_group_id pour grouper les commandes d'un même paiement
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_group_id uuid DEFAULT gen_random_uuid();

-- 2. Simplifier delivery_requests - pickup_point unique au lieu de pickup_points (array)
-- Le pickup_point est maintenant un objet JSON unique au lieu d'un tableau
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS pickup_point jsonb;

-- 3. Ajouter shop_id directement sur la commande (1 commande = 1 vendeur)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES shops(id);

-- Créer l'index pour performance
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_group_id ON orders(payment_group_id);

-- 4. Ajouter champs pour le remboursement Paystack dans refunds
ALTER TABLE refunds 
ADD COLUMN IF NOT EXISTS paystack_refund_id text,
ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'pending';

-- Commentaires
COMMENT ON COLUMN orders.payment_group_id IS 'Groupe les commandes créées lors du même checkout (même paiement)';
COMMENT ON COLUMN orders.shop_id IS 'Boutique unique pour cette commande (1 commande = 1 vendeur)';
COMMENT ON COLUMN delivery_requests.pickup_point IS 'Point de collecte unique (remplace pickup_points array)';
COMMENT ON COLUMN refunds.paystack_refund_id IS 'ID du remboursement Paystack';
COMMENT ON COLUMN refunds.refund_status IS 'Statut du remboursement: pending, processing, processed, failed';