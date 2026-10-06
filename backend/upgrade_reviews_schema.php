<?php
require_once __DIR__ . '/config/database.php';
$database = new Database();
$db = $database->getConnection();

echo "=== UPGRADING REVIEWS TABLE SCHEMA ===\n";

// 1. Modify status enum
try {
    $db->exec("ALTER TABLE reviews MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING'");
    echo "✓ Status ENUM updated to include HIDDEN\n";
} catch (Exception $e) {
    echo "Status ENUM error: " . $e->getMessage() . "\n";
}

// 2. Add columns if not existing
$columnsToAdd = [
    'title' => "ALTER TABLE reviews ADD COLUMN title VARCHAR(255) NULL AFTER rating",
    'order_id' => "ALTER TABLE reviews ADD COLUMN order_id INT(11) NULL AFTER user_id",
    'verified_purchase' => "ALTER TABLE reviews ADD COLUMN verified_purchase TINYINT(1) NOT NULL DEFAULT 0 AFTER order_id",
    'moderation_reason' => "ALTER TABLE reviews ADD COLUMN moderation_reason VARCHAR(255) NULL AFTER status",
    'moderated_by' => "ALTER TABLE reviews ADD COLUMN moderated_by INT(11) NULL AFTER moderation_reason",
    'moderated_at' => "ALTER TABLE reviews ADD COLUMN moderated_at DATETIME NULL AFTER moderated_by",
    'images' => "ALTER TABLE reviews ADD COLUMN images TEXT NULL AFTER comment",
    'updated_at' => "ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    'deleted_at' => "ALTER TABLE reviews ADD COLUMN deleted_at DATETIME NULL AFTER updated_at"
];

$existingCols = $db->query("DESCRIBE reviews")->fetchAll(PDO::FETCH_COLUMN);

foreach ($columnsToAdd as $colName => $sql) {
    if (!in_array($colName, $existingCols)) {
        try {
            $db->exec($sql);
            echo "✓ Added column $colName\n";
        } catch (Exception $e) {
            echo "Error adding $colName: " . $e->getMessage() . "\n";
        }
    } else {
        echo "- Column $colName already exists\n";
    }
}

// Add indexes if not present
try {
    $db->exec("CREATE INDEX idx_reviews_prod_status ON reviews (product_id, status, deleted_at)");
    echo "✓ Added index idx_reviews_prod_status\n";
} catch (Exception $e) {
    // index may already exist
}
try {
    $db->exec("CREATE INDEX idx_reviews_user ON reviews (user_id)");
    echo "✓ Added index idx_reviews_user\n";
} catch (Exception $e) {
}
try {
    $db->exec("CREATE INDEX idx_reviews_rating ON reviews (rating)");
    echo "✓ Added index idx_reviews_rating\n";
} catch (Exception $e) {
}

// Update existing reviews to have titles and proper customer links
$db->exec("UPDATE reviews SET title = 'Excellent Quality & Immunity Booster', user_id = 5, order_id = 1001, verified_purchase = 1 WHERE id = 1");
$db->exec("UPDATE reviews SET title = 'Gentle on stomach, great absorption', user_id = 4, order_id = 1002, verified_purchase = 1 WHERE id = 2");
$db->exec("UPDATE reviews SET title = 'No fishy aftertaste', user_id = 5, order_id = 1001, verified_purchase = 1 WHERE id = 3");
$db->exec("UPDATE reviews SET title = 'Highly accurate and easy to use', user_id = 4, order_id = 1002, verified_purchase = 1 WHERE id = 4");
$db->exec("UPDATE reviews SET title = 'Essential home health device', user_id = 3, verified_purchase = 0 WHERE id = 5");
$db->exec("UPDATE reviews SET title = 'Decent protein supplement', user_id = 3, verified_purchase = 0 WHERE id = 6");
$db->exec("UPDATE reviews SET title = 'Great energy lift', user_id = 5, verified_purchase = 1 WHERE id = 7");
$db->exec("UPDATE reviews SET title = 'Best daily multivitamin', user_id = 4, verified_purchase = 1 WHERE id = 8");
$db->exec("UPDATE reviews SET title = 'Good nutritional balance', user_id = 3, verified_purchase = 0 WHERE id = 9");
$db->exec("UPDATE reviews SET title = 'Fast relief for headache and fever', user_id = 5, verified_purchase = 1 WHERE id = 10");
$db->exec("UPDATE reviews SET title = 'Effective muscle ache relief', user_id = 4, verified_purchase = 1 WHERE id = 11");

// Seed realistic PENDING and REJECTED reviews for moderation testing
$checkPending = $db->query("SELECT COUNT(*) FROM reviews WHERE status = 'PENDING'")->fetchColumn();
if ($checkPending == 0) {
    echo "Adding realistic PENDING reviews for moderation...\n";
    $db->exec("INSERT INTO reviews (product_id, user_id, order_id, verified_purchase, rating, title, comment, status, created_at) VALUES
    (1, 5, 1001, 1, 5, 'Super fast delivery and great packaging', 'Ordered this twice now. Tablets are fresh and sealed properly. Excellent customer service by Medicare Plus.', 'PENDING', NOW() - INTERVAL 2 HOUR),
    (2, 4, 1002, 1, 4, 'Very good omega 3 capsules', 'The gelatin softgels are easy to swallow with zero reflux. Will definitely buy again.', 'PENDING', NOW() - INTERVAL 4 HOUR),
    (3, 3, NULL, 0, 5, 'Doctor recommended blood pressure meter', 'My physician told me to buy this exact brand for home monitoring. Very clear LCD display and memory storage.', 'PENDING', NOW() - INTERVAL 1 DAY),
    (15, 5, 1001, 1, 4, 'Effective medicine, worked in 20 minutes', 'Relieved sinus headache without making me drowsy.', 'PENDING', NOW() - INTERVAL 6 HOUR)");
}

$checkRejected = $db->query("SELECT COUNT(*) FROM reviews WHERE status = 'REJECTED'")->fetchColumn();
if ($checkRejected == 0) {
    echo "Adding realistic REJECTED review...\n";
    $db->exec("INSERT INTO reviews (product_id, user_id, order_id, verified_purchase, rating, title, comment, status, moderation_reason, moderated_by, moderated_at, created_at) VALUES
    (1, 3, NULL, 0, 1, 'Check out this external link for cheap meds', 'Visit my website http://example-spam.com for 90% discount on drugs.', 'REJECTED', 'Spam / Promotional link', 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 DAY)");
}

echo "=== UPGRADE COMPLETE ===\n";
$stats = $db->query("SELECT status, count(*) as count FROM reviews GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($stats, JSON_PRETTY_PRINT) . "\n";
