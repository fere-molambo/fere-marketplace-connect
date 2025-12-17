
-- Services for BTP Solutions (maçon, carreleur)
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('abfaf987-b7de-4c77-9151-ab21dfcf3e65', 'Construction mur en briques', 'Construction de murs avec finition', 120000, 'negoce', 480, true),
('abfaf987-b7de-4c77-9151-ab21dfcf3e65', 'Pose carrelage sol (m²)', 'Carrelage standard pose comprise', 8000, 'fixe', 60, true),
('abfaf987-b7de-4c77-9151-ab21dfcf3e65', 'Rénovation salle de bain', 'Rénovation complète avec carrelage et sanitaires', 350000, 'negoce', 1440, true),
('abfaf987-b7de-4c77-9151-ab21dfcf3e65', 'Enduit mur intérieur', 'Application denduit de finition', 25000, 'fixe', 240, true);

-- Products for GameZone Mali (jeux, consoles)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('1abdae05-d13c-4d14-a45f-cbcd38408014', 'PlayStation 5', 'Console Sony PS5 avec manette DualSense', 475000, 'unitaire', '4f6243a9-f25d-4704-a866-95b8d949e7dd', 'neuf', 8, true),
('1abdae05-d13c-4d14-a45f-cbcd38408014', 'Xbox Series X', 'Console Microsoft avec Game Pass 3 mois', 420000, 'unitaire', '4f6243a9-f25d-4704-a866-95b8d949e7dd', 'neuf', 6, true),
('1abdae05-d13c-4d14-a45f-cbcd38408014', 'Nintendo Switch OLED', 'Console portable avec écran OLED 7"', 280000, 'negoce', '4f6243a9-f25d-4704-a866-95b8d949e7dd', 'neuf', 12, true);

-- Services for GameZone Mali
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('1abdae05-d13c-4d14-a45f-cbcd38408014', 'Réparation console PS5/Xbox', 'Diagnostic et réparation de consoles', 25000, 'fixe', 120, true);

-- Products for Bureau & Co (ordinateurs, bureautique)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('300dc985-22bc-4de8-a9e1-7016ab53f686', 'HP ProBook 450 G10', 'Laptop professionnel i5 16GB RAM', 485000, 'unitaire', 'd672c258-12bf-4cff-897c-e9510e1f0c43', 'neuf', 15, true),
('300dc985-22bc-4de8-a9e1-7016ab53f686', 'Dell OptiPlex 7010 (lot de 5)', 'PC bureautique reconditionné', 750000, 'en_gros', 'd672c258-12bf-4cff-897c-e9510e1f0c43', '2eme_main', 20, true),
('300dc985-22bc-4de8-a9e1-7016ab53f686', 'Imprimante HP LaserJet Pro', 'Imprimante laser monochrome réseau', 185000, 'unitaire', 'd672c258-12bf-4cff-897c-e9510e1f0c43', 'neuf', 25, true),
('300dc985-22bc-4de8-a9e1-7016ab53f686', 'Écran Dell 27" 4K', 'Moniteur professionnel IPS 4K USB-C', 320000, 'negoce', 'd672c258-12bf-4cff-897c-e9510e1f0c43', 'neuf', 18, true);

-- Services for Artisans Express (multi-services)
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('1de23368-afe3-4135-a4b9-2e9f03e7f3ec', 'Montage meuble IKEA', 'Assemblage de meubles en kit', 8000, 'fixe', 90, true),
('1de23368-afe3-4135-a4b9-2e9f03e7f3ec', 'Déménagement petit volume', 'Transport et manutention jusqu à 10m³', 45000, 'fixe', 240, true),
('1de23368-afe3-4135-a4b9-2e9f03e7f3ec', 'Installation climatiseur', 'Pose et mise en service climatisation', 35000, 'negoce', 180, true),
('1de23368-afe3-4135-a4b9-2e9f03e7f3ec', 'Jardinage et entretien', 'Tonte, taille et nettoyage jardin', 15000, 'fixe', 180, true);

-- Products for Audio Vision (TV, audio)
INSERT INTO products (shop_id, name, description, price, price_type, category_id, condition, quantity_available, is_active) VALUES
('b0fd798f-3bc0-424e-abaf-d67794769bff', 'Sony Bravia XR 55"', 'TV OLED 4K avec processeur XR', 980000, 'negoce', '1ebb895b-c056-4f72-847e-319302b3e721', 'neuf', 6, true),
('b0fd798f-3bc0-424e-abaf-d67794769bff', 'Barre de son Samsung HW-Q990C', 'Système Dolby Atmos 11.1.4 canaux', 450000, 'unitaire', '2e595c4e-e736-459c-a2cd-30c15f712e9e', 'neuf', 10, true),
('b0fd798f-3bc0-424e-abaf-d67794769bff', 'Enceinte JBL PartyBox 710', 'Enceinte de soirée 800W avec LED', 380000, 'unitaire', '2e595c4e-e736-459c-a2cd-30c15f712e9e', 'neuf', 8, true);

-- Services for Audio Vision (installation)
INSERT INTO services (shop_id, name, description, price, price_type, duration, is_active) VALUES
('b0fd798f-3bc0-424e-abaf-d67794769bff', 'Installation Home Cinéma', 'Installation complète système audio-vidéo', 75000, 'fixe', 240, true),
('b0fd798f-3bc0-424e-abaf-d67794769bff', 'Configuration TV intelligente', 'Paramétrage complet Smart TV et applications', 15000, 'fixe', 60, true);
