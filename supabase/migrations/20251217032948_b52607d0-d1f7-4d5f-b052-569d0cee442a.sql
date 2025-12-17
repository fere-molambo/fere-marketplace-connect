
-- Products for TechMali Store (mixte: smartphones, tablettes)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'iPhone 15 Pro Max', 'Le dernier iPhone avec puce A17 Pro et appareil photo 48MP', 850000, 'unitaire', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 15, true),
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'Samsung Galaxy S24 Ultra', 'Smartphone Android haut de gamme avec S Pen', 750000, 'unitaire', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 20, true),
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'iPad Pro 12.9"', 'Tablette Apple avec puce M2 et écran Liquid Retina XDR', 650000, 'negoce', '88f1bbf6-d145-4f14-be0b-6c1bf8624245', 'neuf', 8, true),
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'Câbles Lightning (lot de 10)', 'Câbles de charge certifiés Apple', 25000, 'en_gros', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 100, true);

-- Services for TechMali Store
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'Réparation écran iPhone', 'Remplacement écran cassé pour tous modèles iPhone', 35000, 'fixe', 60, true),
('dbdf0e27-7056-40f0-a604-54f7d1e0eabb', 'Réparation écran Samsung', 'Remplacement écran pour téléphones Samsung', 30000, 'fixe', 60, true);

-- Products for ElectroHome (TV, électroménager)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('cb8290c1-9b8c-45a8-b569-c7abf6dc505b', 'Samsung Smart TV 55"', 'TV 4K UHD avec Tizen OS et HDR10+', 450000, 'unitaire', '1ebb895b-c056-4f72-847e-319302b3e721', 'neuf', 12, true),
('cb8290c1-9b8c-45a8-b569-c7abf6dc505b', 'LG OLED TV 65"', 'TV OLED 4K avec Dolby Vision et Atmos', 1200000, 'negoce', '1ebb895b-c056-4f72-847e-319302b3e721', 'neuf', 5, true),
('cb8290c1-9b8c-45a8-b569-c7abf6dc505b', 'Climatiseur Split 12000 BTU', 'Climatiseur Inverter économe en énergie', 280000, 'unitaire', '4baa7db5-7aaf-4a5e-9d93-4c7731acfc57', 'neuf', 18, true),
('cb8290c1-9b8c-45a8-b569-c7abf6dc505b', 'Réfrigérateur Samsung 500L', 'Réfrigérateur double porte avec distributeur eau', 550000, 'negoce', '4baa7db5-7aaf-4a5e-9d93-4c7731acfc57', 'neuf', 8, true);

-- Services for Services Pro Bamako (plombier, électricien, peintre)
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('e0054246-37fb-43dd-b82c-47ee29d68e95', 'Plomberie - Dépannage urgent', 'Intervention rapide pour fuites et bouchons', 15000, 'fixe', 120, true),
('e0054246-37fb-43dd-b82c-47ee29d68e95', 'Installation électrique complète', 'Câblage et mise aux normes électriques', 75000, 'negoce', 480, true),
('e0054246-37fb-43dd-b82c-47ee29d68e95', 'Peinture intérieure (chambre)', 'Peinture complète dune chambre standard', 45000, 'fixe', 240, true),
('e0054246-37fb-43dd-b82c-47ee29d68e95', 'Installation robinetterie', 'Pose de robinets et éviers', 20000, 'fixe', 90, true);

-- Products for BazarMix (accessoires)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('a78c046c-d8cf-45ff-a089-e4904ee36558', 'Support TV mural universel', 'Support pivotant pour TV 32" à 65"', 18000, 'en_gros', '3af6acc2-6faa-4a3e-be3c-b8fceaef84b6', 'neuf', 50, true),
('a78c046c-d8cf-45ff-a089-e4904ee36558', 'Multiprise parafoudre 6 prises', 'Protection contre les surtensions', 8500, 'en_gros', '4baa7db5-7aaf-4a5e-9d93-4c7731acfc57', 'neuf', 80, true),
('a78c046c-d8cf-45ff-a089-e4904ee36558', 'Casque Bluetooth JBL', 'Casque sans fil avec réduction de bruit', 35000, 'unitaire', '2e595c4e-e736-459c-a2cd-30c15f712e9e', 'neuf', 25, true);

-- Services for BazarMix (aide ménagère)
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('a78c046c-d8cf-45ff-a089-e4904ee36558', 'Ménage complet maison', 'Nettoyage intégral de votre domicile', 10000, 'fixe', 180, true),
('a78c046c-d8cf-45ff-a089-e4904ee36558', 'Repassage à domicile', 'Service de repassage pour vêtements', 5000, 'fixe', 120, true);

-- Products for MobileFirst (smartphones, accessoires)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('51b53174-73f5-4440-8b97-311747f3d962', 'Xiaomi Redmi Note 13', 'Smartphone milieu de gamme avec batterie 5000mAh', 125000, 'unitaire', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 30, true),
('51b53174-73f5-4440-8b97-311747f3d962', 'Samsung Galaxy A54', 'Smartphone Android avec écran Super AMOLED', 275000, 'unitaire', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 22, true),
('51b53174-73f5-4440-8b97-311747f3d962', 'iPhone 13 (reconditionné)', 'iPhone 13 128GB en excellent état', 350000, 'negoce', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', '2eme_main', 10, true),
('51b53174-73f5-4440-8b97-311747f3d962', 'Coques silicone (lot de 20)', 'Coques de protection pour smartphones variés', 30000, 'en_gros', '3cb4a9c4-5549-4330-9659-36f8cb5b63a7', 'neuf', 60, true);
