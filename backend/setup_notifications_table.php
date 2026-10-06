<?php
// backend/setup_notifications_table.php
require_once __DIR__ . '/config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed\n");
}

echo "Setting up notifications table...\n";

$sql = "CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `admin_id` INT NULL,
    `type` VARCHAR(50) NOT NULL COMMENT 'ORDER, PRESCRIPTION, REVIEW, INVENTORY, CUSTOMER, PRODUCT, COUPON, SYSTEM, PAYMENT, SECURITY',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') DEFAULT 'NORMAL',
    `entity_type` VARCHAR(50) NULL,
    `entity_id` VARCHAR(100) NULL,
    `action_url` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `read_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    INDEX `idx_admin_read_created` (`admin_id`, `is_read`, `created_at`),
    INDEX `idx_admin_type_created` (`admin_id`, `type`, `created_at`),
    INDEX `idx_entity` (`entity_type`, `entity_id`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$db->exec($sql);
echo "Table `notifications` checked/created successfully.\n";

// Check if there are any notifications. If empty, seed from real database records
$count = $db->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
echo "Current notification count: $count\n";

if ($count == 0) {
    echo "Seeding initial notifications from real MySQL events...\n";

    // 1. Orders
    $orders = $db->query("
        SELECT o.id, o.order_number, o.total_amount, o.order_status, o.created_at, 
               COALESCE(u.name, 'Customer') as customer_name,
               COALESCE(u.email, '') as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC LIMIT 8
    ")->fetchAll(PDO::FETCH_ASSOC);

    $insertStmt = $db->prepare("
        INSERT INTO notifications (admin_id, type, title, message, priority, entity_type, entity_id, action_url, metadata, is_read, read_at, created_at)
        VALUES (:admin_id, :type, :title, :message, :priority, :entity_type, :entity_id, :action_url, :metadata, :is_read, :read_at, :created_at)
    ");

    $idx = 0;
    foreach ($orders as $order) {
        $isRead = ($idx > 2) ? 1 : 0;
        $readAt = $isRead ? date('Y-m-d H:i:s', strtotime($order['created_at'] . ' + 1 hour')) : null;
        $orderNum = !empty($order['order_number']) ? $order['order_number'] : ('ORD-' . $order['id']);
        $totalFormatted = '₹' . number_format($order['total_amount'], 2);

        $insertStmt->execute([
            ':admin_id' => null, // Global to all admins
            ':type' => 'ORDER',
            ':title' => 'New Order Received',
            ':message' => "Order #{$orderNum} was placed by {$order['customer_name']} for {$totalFormatted}.",
            ':priority' => 'NORMAL',
            ':entity_type' => 'order',
            ':entity_id' => (string)$order['id'],
            ':action_url' => "/admin/orders",
            ':metadata' => json_encode([
                'order_number' => $orderNum,
                'customer_name' => $order['customer_name'],
                'customer_email' => $order['customer_email'],
                'total_amount' => $order['total_amount'],
                'order_status' => $order['order_status']
            ]),
            ':is_read' => $isRead,
            ':read_at' => $readAt,
            ':created_at' => $order['created_at']
        ]);
        $idx++;
    }

    // 2. Prescriptions
    $prescriptions = $db->query("
        SELECT p.id, p.prescription_number, p.status, p.created_at,
               COALESCE(u.name, 'Patient') as patient_name
        FROM prescriptions p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC LIMIT 4
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($prescriptions as $p) {
        $rxNum = !empty($p['prescription_number']) ? $p['prescription_number'] : ('RX-' . $p['id']);
        $isPending = ($p['status'] === 'PENDING' || $p['status'] === 'PENDING_REVIEW');
        $priority = $isPending ? 'HIGH' : 'NORMAL';
        $isRead = $isPending ? 0 : 1;
        $readAt = $isRead ? date('Y-m-d H:i:s', strtotime($p['created_at'] . ' + 30 minutes')) : null;

        $insertStmt->execute([
            ':admin_id' => null,
            ':type' => 'PRESCRIPTION',
            ':title' => $isPending ? 'Prescription Awaiting Review' : 'Prescription Processed',
            ':message' => "Prescription #{$rxNum} submitted by {$p['patient_name']} " . ($isPending ? "requires pharmacist verification." : "has been {$p['status']}."),
            ':priority' => $priority,
            ':entity_type' => 'prescription',
            ':entity_id' => (string)$p['id'],
            ':action_url' => "/admin/prescriptions",
            ':metadata' => json_encode([
                'prescription_number' => $rxNum,
                'patient_name' => $p['patient_name'],
                'status' => $p['status']
            ]),
            ':is_read' => $isRead,
            ':read_at' => $readAt,
            ':created_at' => $p['created_at']
        ]);
    }

    // 3. Reviews
    $reviews = $db->query("
        SELECT r.id, r.product_id, r.rating, r.comment, r.status, r.created_at,
               COALESCE(p.name, 'Product') as product_name,
               COALESCE(u.name, 'Customer') as customer_name
        FROM reviews r
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($reviews as $rev) {
        $isPending = ($rev['status'] === 'PENDING');
        $isRead = $isPending ? 0 : 1;
        $readAt = $isRead ? date('Y-m-d H:i:s') : null;

        $insertStmt->execute([
            ':admin_id' => null,
            ':type' => 'REVIEW',
            ':title' => 'New Product Review',
            ':message' => "{$rev['customer_name']} submitted a {$rev['rating']}-star review on {$rev['product_name']}.",
            ':priority' => ($rev['rating'] <= 2) ? 'HIGH' : 'NORMAL',
            ':entity_type' => 'review',
            ':entity_id' => (string)$rev['id'],
            ':action_url' => "/admin/reviews",
            ':metadata' => json_encode([
                'product_id' => $rev['product_id'],
                'product_name' => $rev['product_name'],
                'rating' => $rev['rating'],
                'customer_name' => $rev['customer_name'],
                'status' => $rev['status']
            ]),
            ':is_read' => $isRead,
            ':read_at' => $readAt,
            ':created_at' => $rev['created_at']
        ]);
    }

    // 4. Inventory Alerts
    // Check low stock products
    $lowStockProducts = $db->query("
        SELECT id, name, sku, stock_quantity, low_stock_threshold 
        FROM products 
        WHERE stock_quantity <= low_stock_threshold OR stock_quantity <= 15
        ORDER BY stock_quantity ASC LIMIT 4
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($lowStockProducts as $prod) {
        $isOut = ($prod['stock_quantity'] <= 0);
        $insertStmt->execute([
            ':admin_id' => null,
            ':type' => 'INVENTORY',
            ':title' => $isOut ? 'Product Out of Stock' : 'Low Stock Alert',
            ':message' => $isOut 
                ? "{$prod['name']} (SKU: {$prod['sku']}) is completely out of stock!" 
                : "{$prod['name']} (SKU: {$prod['sku']}) has only {$prod['stock_quantity']} units remaining (Threshold: {$prod['low_stock_threshold']}).",
            ':priority' => $isOut ? 'CRITICAL' : 'HIGH',
            ':entity_type' => 'product',
            ':entity_id' => (string)$prod['id'],
            ':action_url' => "/admin/inventory",
            ':metadata' => json_encode([
                'product_id' => $prod['id'],
                'name' => $prod['name'],
                'sku' => $prod['sku'],
                'stock_quantity' => $prod['stock_quantity'],
                'low_stock_threshold' => $prod['low_stock_threshold']
            ]),
            ':is_read' => 0,
            ':read_at' => null,
            ':created_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
        ]);
    }

    // 5. Customer Registration
    $recentUsers = $db->query("
        SELECT id, name, email, created_at 
        FROM users 
        WHERE role = 'CUSTOMER' OR role = 'customer'
        ORDER BY created_at DESC LIMIT 3
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($recentUsers as $u) {
        $insertStmt->execute([
            ':admin_id' => null,
            ':type' => 'CUSTOMER',
            ':title' => 'New Customer Registered',
            ':message' => "Customer {$u['name']} ({$u['email']}) registered a new account.",
            ':priority' => 'LOW',
            ':entity_type' => 'customer',
            ':entity_id' => (string)$u['id'],
            ':action_url' => "/admin/customers",
            ':metadata' => json_encode([
                'user_id' => $u['id'],
                'name' => $u['name'],
                'email' => $u['email']
            ]),
            ':is_read' => 1,
            ':read_at' => date('Y-m-d H:i:s', strtotime($u['created_at'] . ' + 1 hour')),
            ':created_at' => $u['created_at']
        ]);
    }

    // 6. System Notification
    $insertStmt->execute([
        ':admin_id' => null,
        ':type' => 'SYSTEM',
        ':title' => 'Medicare PLUS System Active',
        ':message' => 'Notification center and analytics services initialized successfully.',
        ':priority' => 'LOW',
        ':entity_type' => 'system',
        ':entity_id' => null,
        ':action_url' => "/admin/settings",
        ':metadata' => json_encode(['status' => 'online']),
        ':is_read' => 1,
        ':read_at' => date('Y-m-d H:i:s'),
        ':created_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
    ]);

    $finalCount = $db->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
    $unreadCount = $db->query("SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND deleted_at IS NULL")->fetchColumn();
    echo "Seeding completed! Total notifications: $finalCount, Unread: $unreadCount\n";
} else {
    echo "Notifications already exist. Skipping seed.\n";
}
