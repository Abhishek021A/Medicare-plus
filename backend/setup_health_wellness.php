<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();

// 1. Check or Insert Health Wellness category
$hw = $db->query("SELECT * FROM categories WHERE slug = 'health-wellness' OR LOWER(name) = 'health & wellness' OR LOWER(name) = 'health wellness'")->fetch(PDO::FETCH_ASSOC);

if (!$hw) {
    $stmt = $db->prepare("INSERT INTO categories (name, slug, description, image, parent_id, status, sort_order, show_on_homepage) VALUES ('Health & Wellness', 'health-wellness', 'Boost your vitality with premium vitamins, supplements, nutrition and wellness care.', 'wellness.jpg', NULL, 'ACTIVE', 2, 1)");
    $stmt->execute();
    $hwId = $db->lastInsertId();
    echo "Created Health & Wellness category with ID: $hwId\n";
} else {
    $hwId = $hw['id'];
    echo "Found existing Health Wellness category ID: $hwId (slug: {$hw['slug']})\n";
    if ($hw['slug'] !== 'health-wellness') {
        $db->exec("UPDATE categories SET slug = 'health-wellness' WHERE id = $hwId");
        echo "Updated slug to 'health-wellness'\n";
    }
}

// 2. Link relevant categories as subcategories of Health & Wellness
$subcatSlugs = ['vitamins-supplements', 'ayurvedic-herbal', 'health-food-drinks', 'diabetic-care', 'sexual-wellness', 'elderly-care'];
foreach ($subcatSlugs as $slug) {
    $sub = $db->query("SELECT id, name, parent_id FROM categories WHERE slug = '$slug'")->fetch(PDO::FETCH_ASSOC);
    if ($sub) {
        $db->exec("UPDATE categories SET parent_id = $hwId WHERE id = {$sub['id']}");
        echo "Linked subcategory '{$sub['name']}' (ID {$sub['id']}) to Health Wellness (parent_id = $hwId)\n";
    }
}

// 3. Test query of products belonging to Health & Wellness and its subcategories
$query = "SELECT p.id, p.name, p.price, p.sale_price, p.stock_quantity, b.name as brand_name, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          LEFT JOIN brands b ON p.brand_id = b.id 
          WHERE p.status = 'ACTIVE' 
          AND (c.slug = 'health-wellness' OR c.id = $hwId OR c.parent_id = $hwId)";
$prods = $db->query($query)->fetchAll(PDO::FETCH_ASSOC);
echo "\nTotal products in Health Wellness scope: " . count($prods) . "\n";
foreach ($prods as $p) {
    echo " - [ID {$p['id']}] {$p['name']} | ₹{$p['price']} | Brand: {$p['brand_name']} | Cat: {$p['category_name']}\n";
}
