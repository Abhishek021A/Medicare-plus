USE pharmacy_store;

-- --------------------------------------------------------
-- Users (Password is 'password123' for all seeded users for convenience - normally hashed with password_hash)
-- In PHP, we will assume we check password hashes, but for seed we use a known hash.
-- Hash of 'password123' using bcrypt: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- --------------------------------------------------------
INSERT INTO users (name, email, password, phone, role, status) VALUES
('Super Admin', 'admin@medicareplus.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1234567890', 'SUPER_ADMIN', 'ACTIVE'),
('Pharmacy Manager', 'manager@medicareplus.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '1234567891', 'PHARMACY_MANAGER', 'ACTIVE'),
('John Doe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9876543210', 'CUSTOMER', 'ACTIVE'),
('Jane Smith', 'jane@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9876543211', 'CUSTOMER', 'ACTIVE');

-- --------------------------------------------------------
-- Categories
-- --------------------------------------------------------
INSERT INTO categories (name, slug, description, image, status) VALUES
('Vitamins & Supplements', 'vitamins-supplements', 'Boost your health with our premium vitamins.', 'vitamins.jpg', 'ACTIVE'),
('Personal Care', 'personal-care', 'Everyday personal care products.', 'personal-care.jpg', 'ACTIVE'),
('Medical Devices', 'medical-devices', 'Reliable health monitoring devices.', 'devices.jpg', 'ACTIVE'),
('Baby Care', 'baby-care', 'Gentle care for your little ones.', 'baby.jpg', 'ACTIVE'),
('Skin Care', 'skin-care', 'Dermatologist tested skin care.', 'skincare.jpg', 'ACTIVE'),
('Diabetic Care', 'diabetic-care', 'Specialized products for diabetics.', 'diabetic.jpg', 'ACTIVE'),
('Ayurvedic & Herbal', 'ayurvedic-herbal', 'Natural remedies.', 'herbal.jpg', 'ACTIVE'),
('Health Food & Drinks', 'health-food-drinks', 'Nutritious foods and supplements.', 'health-foods.jpg', 'ACTIVE'),
('Elderly Care', 'elderly-care', 'Products supporting senior health.', 'elderly.jpg', 'ACTIVE'),
('Sexual Wellness', 'sexual-wellness', 'Products for intimate health.', 'sexual-wellness.jpg', 'ACTIVE'),
('First Aid', 'first-aid', 'Essential first aid supplies.', 'first-aid.jpg', 'ACTIVE'),
('Over The Counter', 'otc', 'Common non-prescription medicines.', 'otc.jpg', 'ACTIVE');

-- --------------------------------------------------------
-- Brands
-- --------------------------------------------------------
INSERT INTO brands (name, slug, status) VALUES
('HealthVital', 'healthvital', 'ACTIVE'),
('MediCare Pure', 'medicare-pure', 'ACTIVE'),
('NutriLife', 'nutrilife', 'ACTIVE'),
('DermaGlow', 'dermaglow', 'ACTIVE'),
('BabySoft', 'babysoft', 'ACTIVE'),
('AyurRoots', 'ayurroots', 'ACTIVE'),
('OmniHealth', 'omnihealth', 'ACTIVE'),
('SafeGuard', 'safeguard', 'ACTIVE');

-- --------------------------------------------------------
-- Products
-- --------------------------------------------------------
INSERT INTO products (category_id, brand_id, name, slug, sku, description, short_description, price, sale_price, stock_quantity, status, prescription_required, featured, bestseller, new_launch) VALUES
(1, 1, 'Vitamin C 1000mg Tablets', 'vitamin-c-1000mg', 'SKU-VITC-001', 'High strength Vitamin C for immunity.', 'Immunity booster', 15.00, 12.00, 100, 'ACTIVE', FALSE, TRUE, TRUE, FALSE),
(1, 3, 'Omega 3 Fish Oil Capsules', 'omega-3-fish-oil', 'SKU-OMG3-002', 'Premium quality fish oil rich in EPA and DHA.', 'Heart and brain health', 25.00, 20.00, 50, 'ACTIVE', FALSE, TRUE, TRUE, FALSE),
(3, 7, 'Digital Blood Pressure Monitor', 'bp-monitor-digital', 'SKU-DEV-003', 'Accurate and easy to use BP monitor.', 'Monitor your health at home', 45.00, 40.00, 20, 'ACTIVE', FALSE, TRUE, FALSE, TRUE),
(8, 3, 'Protein Supplement Powder', 'protein-powder-vanilla', 'SKU-PROT-004', 'High quality whey protein in vanilla flavor.', 'Muscle recovery', 55.00, 49.99, 30, 'ACTIVE', FALSE, FALSE, TRUE, FALSE),
(1, 1, 'Multivitamin Tablets Daily', 'multivitamin-daily', 'SKU-MULT-005', 'Complete daily multivitamin for men and women.', 'Daily essential nutrients', 18.00, NULL, 150, 'ACTIVE', FALSE, FALSE, TRUE, FALSE),
(6, 2, 'Diabetic Nutrition Powder', 'diabetic-nutrition', 'SKU-DIAB-006', 'Specially formulated for diabetic patients.', 'Sugar-free nutrition', 35.00, 30.00, 40, 'ACTIVE', FALSE, TRUE, FALSE, TRUE),
(12, 8, 'Paracetamol 500mg Tablets', 'paracetamol-500mg', 'SKU-PARA-007', 'Effective relief from fever and pain.', 'Fever and pain relief', 5.00, NULL, 500, 'ACTIVE', FALSE, FALSE, TRUE, FALSE),
(12, 8, 'Amoxicillin 250mg Capsules', 'amoxicillin-250mg', 'SKU-AMOX-008', 'Broad spectrum antibiotic.', 'Antibiotic medication', 12.00, NULL, 100, 'ACTIVE', TRUE, FALSE, FALSE, FALSE),
(2, 4, 'Moisturizing Face Wash', 'moisturizing-face-wash', 'SKU-FACE-009', 'Gentle face wash for all skin types.', 'Cleanses and hydrates', 10.00, 8.50, 80, 'ACTIVE', FALSE, FALSE, FALSE, TRUE),
(11, 8, 'Standard First Aid Kit', 'first-aid-kit-standard', 'SKU-FAK-010', 'Comprehensive first aid kit for home.', 'Essential emergency supplies', 25.00, NULL, 25, 'ACTIVE', FALSE, TRUE, FALSE, FALSE);

-- --------------------------------------------------------
-- Coupons
-- --------------------------------------------------------
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, start_date, expiry_date, status) VALUES
('WELCOME10', 'PERCENTAGE', 10.00, 50.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'ACTIVE'),
('FLAT5', 'FIXED', 5.00, 20.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'ACTIVE'),
('HEALTH20', 'PERCENTAGE', 20.00, 100.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'ACTIVE');

-- --------------------------------------------------------
-- Banners
-- --------------------------------------------------------
INSERT INTO banners (title, subtitle, image, button_text, button_url, sort_order) VALUES
('Your Health, Our Priority', 'Quality medicines and healthcare products delivered to your doorstep.', 'hero-1.jpg', 'Shop Now', '/shop', 1),
('Up To 25% Off', 'Extra offers on selected healthcare brands', 'promo-1.jpg', 'Explore Categories', '/categories', 2);
