
-- Nettoyage des vendeurs et boutique Fashion consulting
-- Boutique à supprimer: f944559d-a6f2-4f12-b861-bae5c7c8d30a
-- Vendeurs à supprimer: 586c3679, 95ec18c8, a3669fbd, ee3642fc

-- 1. Supprimer les données de la boutique Fashion consulting
DELETE FROM flash_sales WHERE product_id IN (SELECT id FROM products WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM flash_sales WHERE service_id IN (SELECT id FROM services WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM product_reviews WHERE product_id IN (SELECT id FROM products WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM service_reviews WHERE service_id IN (SELECT id FROM services WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM service_availability_slots WHERE service_id IN (SELECT id FROM services WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM favorites WHERE product_id IN (SELECT id FROM products WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM favorites WHERE service_id IN (SELECT id FROM services WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a');
DELETE FROM products WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM services WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM generated_images WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM shop_stories WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM shop_reviews WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM shop_team_members WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM order_items WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM orders WHERE shop_id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';
DELETE FROM shops WHERE id = 'f944559d-a6f2-4f12-b861-bae5c7c8d30a';

-- 2. Supprimer les données des 4 vendeurs
DELETE FROM pending_payouts WHERE recipient_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM refunds WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM client_penalties WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM token_transactions WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM user_tokens WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM favorites WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM notification_preferences WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM device_tokens WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM delivery_addresses WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM live_tracking_sessions WHERE tracker_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM blocked_users WHERE blocker_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff') OR blocked_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM driver_zones WHERE driver_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM conversation_participants WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM messages WHERE sender_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM review_replies WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM payment_transactions WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM pending_payments WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM service_bookings WHERE customer_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM delivery_requests WHERE order_id IN (SELECT id FROM orders WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff'));
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff'));
UPDATE orders SET cancellation_id = NULL WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM cancellations WHERE cancelled_by IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM orders WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM user_roles WHERE user_id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
DELETE FROM profiles WHERE id IN ('586c3679-f0d8-4bf2-b6f4-26938cd057f8','95ec18c8-8e0b-4a27-b457-6f808ac64165','a3669fbd-162a-439c-bb05-b6d2fb102287','ee3642fc-c882-488a-acda-271e9f1219ff');
