<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();

echo "--- ALL CATEGORIES ---\n";
$cats = $db->query("SELECT id, name, slug, parent_id, status FROM categories")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cats as $c) {
    echo "ID: {$c['id']} | Name: {$c['name']} | Slug: '{$c['slug']}' | Parent: " . var_export($c['parent_id'], true) . " | Status: {$c['status']}\n";
}

echo "\n--- HEALTH / WELLNESS SEARCH IN CATEGORIES ---\n";
$hw = $db->query("SELECT * FROM categories WHERE LOWER(name) LIKE '%health%' OR LOWER(slug) LIKE '%health%' OR LOWER(name) LIKE '%wellness%' OR LOWER(slug) LIKE '%wellness%'")->fetchAll(PDO::FETCH_ASSOC);
foreach ($hw as $c) {
    echo "MATCH: ID: {$c['id']} | Name: {$c['name']} | Slug: '{$c['slug']}' | Parent: " . var_export($c['parent_id'], true) . "\n";
}

echo "\n--- ALL PRODUCTS ---\n";
$prods = $db->query("SELECT p.id, p.name, p.slug, p.category_id, p.subcategory_id, p.brand_id, p.status, c.name as cat_name, c.slug as cat_slug, b.name as brand_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id")->fetchAll(PDO::FETCH_ASSOC);
foreach ($prods as $p) {
    echo "Prod ID: {$p['id']} | {$p['name']} | CatID: {$p['category_id']} ({$p['cat_name']} / {$p['cat_slug']}) | SubcatID: " . var_export($p['subcategory_id'], true) . " | Brand: {$p['brand_name']} | Status: {$p['status']}\n";
}
