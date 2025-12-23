-- Nettoyage complet des commandes et transactions de test
-- Suppression dans l'ordre des dépendances (clés étrangères)

-- 1. Supprimer les demandes de livraison (référencent orders)
DELETE FROM delivery_requests;

-- 2. Supprimer les articles de commande (référencent orders et products)
DELETE FROM order_items;

-- 3. Supprimer les transactions de paiement (référencent orders via related_id)
DELETE FROM payment_transactions;

-- 4. Supprimer les réservations de services
DELETE FROM service_bookings;

-- 5. Supprimer les commandes principales
DELETE FROM orders;