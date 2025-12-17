
-- Insert TechMali Store
INSERT INTO shops (name, slug, shop_type, owner_id, description, address, is_active, is_official) VALUES
('TechMali Store', 'techmali-store', 'les_deux', '4671cff3-cfc0-42a8-a305-d49dbd70c388', 'Votre partenaire technologie au Mali. Smartphones, tablettes et réparations.', 'Hamdallaye ACI 2000, Bamako', true, false);

-- Insert products for TechMali Store (will get shop_id in next migration)
