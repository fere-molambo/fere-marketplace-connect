
-- Update shop logos and banners
UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80'
WHERE name = 'TechMali Store';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80'
WHERE name = 'ElectroHome';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80'
WHERE name = 'Services Pro Bamako';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80'
WHERE name = 'BazarMix';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80'
WHERE name = 'MobileFirst';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80'
WHERE name = 'BTP Solutions';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1493711662062-fa541f7f39d4?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&q=80'
WHERE name = 'GameZone Mali';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80'
WHERE name = 'Bureau & Co';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80'
WHERE name = 'Artisans Express';

UPDATE shops SET 
  logo_url = 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=200&q=80',
  banner_url = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&q=80'
WHERE name = 'Audio Vision';

-- Update product images
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80' WHERE name = 'iPhone 15 Pro Max';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80' WHERE name = 'Samsung Galaxy S24 Ultra';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80' WHERE name = 'iPad Pro 12.9"';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80' WHERE name LIKE 'Câbles Lightning%';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80' WHERE name = 'Samsung Smart TV 55"';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80' WHERE name = 'LG OLED TV 65"';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80' WHERE name = 'Réfrigérateur Samsung 500L';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1631545806609-22fbf98b3bb3?w=800&q=80' WHERE name = 'Climatiseur Split 12000 BTU';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80' WHERE name = 'PlayStation 5';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80' WHERE name = 'Xbox Series X';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80' WHERE name = 'Nintendo Switch OLED';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' WHERE name = 'HP ProBook 450 G10';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&q=80' WHERE name LIKE 'Dell OptiPlex%';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80' WHERE name = 'Imprimante HP LaserJet Pro';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80' WHERE name = 'Écran Dell 27" 4K';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80' WHERE name = 'Samsung Galaxy A54';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80' WHERE name = 'iPhone 13 reconditionné';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80' WHERE name = 'Xiaomi Redmi Note 13';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80' WHERE name LIKE 'Coques silicone%';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80' WHERE name = 'Sony Bravia XR 55"';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80' WHERE name = 'Barre de son Samsung HW-Q990C';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80' WHERE name = 'Enceinte JBL PartyBox 710';

UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' WHERE name = 'Support TV mural universel';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80' WHERE name = 'Casque Bluetooth JBL Tune 520BT';
UPDATE products SET main_media_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' WHERE name = 'Multiprise parafoudre 6 prises';

-- Update service images
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=800&q=80' WHERE name = 'Réparation écran iPhone';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=800&q=80' WHERE name = 'Réparation écran Samsung';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80' WHERE name = 'Plomberie dépannage urgent';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80' WHERE name = 'Installation robinetterie';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80' WHERE name = 'Installation électrique';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80' WHERE name = 'Peinture intérieure';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80' WHERE name = 'Ménage complet maison';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' WHERE name = 'Repassage à domicile';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80' WHERE name = 'Construction mur en briques';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' WHERE name LIKE 'Pose carrelage%';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80' WHERE name = 'Rénovation salle de bain';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80' WHERE name = 'Enduit mur intérieur';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1493711662062-fa541f7f39d4?w=800&q=80' WHERE name = 'Réparation console PS5/Xbox';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80' WHERE name = 'Montage meuble IKEA';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' WHERE name = 'Déménagement petit volume';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1631545806609-22fbf98b3bb3?w=800&q=80' WHERE name = 'Installation climatiseur';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80' WHERE name = 'Jardinage et entretien';

UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80' WHERE name = 'Installation Home Cinéma';
UPDATE services SET main_media_url = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80' WHERE name = 'Configuration TV intelligente';
