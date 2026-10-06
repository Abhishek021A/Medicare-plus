<?php
require_once 'backend/config/database.php';
require_once 'backend/models/Category.php';

$db = (new Database())->getConnection();
$cat = new Category($db);
$cat->name = 'Test Category ' . time();
$cat->slug = 'test-cat-' . time();
$cat->description = 'Test';
$cat->status = 'ACTIVE';
$cat->parent_id = null;
$cat->sort_order = 0;
$cat->show_on_homepage = 0;

if ($cat->create()) {
    echo "Created!\n";
} else {
    echo "Failed!\n";
    print_r($cat);
}
?>
