<?php
// backend/controllers/OrderController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class OrderController {
    private $method;
    private $id;
    private $subAction;
    private $db;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function processRequest() {
        if ($this->method === 'POST' && isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
            $this->method = 'PUT';
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'summary') {
                    $this->getOrderSummary();
                } else if ($this->id === 'export') {
                    $this->exportOrders();
                } else if ($this->id && $this->id !== 'my-orders') {
                    if ($this->subAction === 'history') {
                        $this->getOrderHistory((int)$this->id);
                    } else {
                        $this->getOrderDetails((int)$this->id);
                    }
                } else if ($this->id === 'my-orders') {
                    $this->getMyOrders();
                } else {
                    // Check user role: Admin gets all orders with filters, customer gets their own
                    $currentUser = AuthMiddleware::requireAuth($this->db);
                    $isAdmin = in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);
                    if ($isAdmin) {
                        $this->getAllOrders();
                    } else {
                        $this->getMyOrders();
                    }
                }
                break;

            case 'POST':
                if ($this->id && ($this->subAction === 'cancel' || (isset($_GET['action']) && $_GET['action'] === 'cancel'))) {
                    $this->cancelOrder((int)$this->id);
                } else {
                    $this->createOrder();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'payment') {
                        $this->updatePaymentStatus((int)$this->id);
                    } else if ($this->subAction === 'status' || empty($this->subAction)) {
                        $this->updateOrderStatus((int)$this->id);
                    } else {
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Unknown order action: " . $this->subAction]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Order ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function calculateSummary() {
        $query = "
            SELECT 
                COUNT(id) as total_orders,
                COALESCE(SUM(CASE WHEN order_status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending_orders,
                COALESCE(SUM(CASE WHEN order_status IN ('CONFIRMED', 'PROCESSING', 'PACKED') THEN 1 ELSE 0 END), 0) as processing_orders,
                COALESCE(SUM(CASE WHEN order_status IN ('SHIPPED', 'OUT_FOR_DELIVERY') THEN 1 ELSE 0 END), 0) as shipped_orders,
                COALESCE(SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END), 0) as delivered_orders,
                COALESCE(SUM(CASE WHEN order_status IN ('CANCELLED', 'REFUNDED') THEN 1 ELSE 0 END), 0) as cancelled_orders,
                COALESCE(ROUND(SUM(CASE WHEN order_status NOT IN ('CANCELLED', 'REFUNDED') THEN total_amount ELSE 0 END), 2), 0.00) as total_revenue
            FROM orders
        ";
        $stmt = $this->db->query($query);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            "total_orders" => (int)($res['total_orders'] ?? 0),
            "pending_orders" => (int)($res['pending_orders'] ?? 0),
            "processing_orders" => (int)($res['processing_orders'] ?? 0),
            "shipped_orders" => (int)($res['shipped_orders'] ?? 0),
            "delivered_orders" => (int)($res['delivered_orders'] ?? 0),
            "cancelled_orders" => (int)($res['cancelled_orders'] ?? 0),
            "total_revenue" => (float)($res['total_revenue'] ?? 0.00),
            // CamelCase aliases
            "totalOrders" => (int)($res['total_orders'] ?? 0),
            "pending" => (int)($res['pending_orders'] ?? 0),
            "processing" => (int)($res['processing_orders'] ?? 0),
            "shipped" => (int)($res['shipped_orders'] ?? 0),
            "delivered" => (int)($res['delivered_orders'] ?? 0),
            "cancelled" => (int)($res['cancelled_orders'] ?? 0),
            "revenue" => (float)($res['total_revenue'] ?? 0.00)
        ];
    }

    private function getOrderSummary() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin privileges required."]);
            return;
        }

        try {
            $summary = $this->calculateSummary();
            echo json_encode(["success" => true, "data" => $summary]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to load summary."]);
        }
    }

    private function getAllOrders() {
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $paymentStatus = trim($_GET['payment_status'] ?? '');
        $paymentMethod = trim($_GET['payment_method'] ?? '');
        $dateRange = trim($_GET['date_range'] ?? '');
        $fromDate = trim($_GET['from_date'] ?? '');
        $toDate = trim($_GET['to_date'] ?? '');
        $sort = trim($_GET['sort'] ?? 'latest');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limitParam = $_GET['limit'] ?? '10';
        $isAll = strtolower($limitParam) === 'all';
        $limit = $isAll ? 1000 : max(1, (int)$limitParam);
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        // 1. Search: Order number, ID, Customer name, email, phone
        if ($search !== '') {
            $cleanedSearch = preg_replace('/^(#|ORD-|MP-)/i', '', $search);
            $where[] = "(
                o.id = :searchId 
                OR o.order_number LIKE :search1 
                OR u.name LIKE :search2 
                OR u.email LIKE :search3 
                OR u.phone LIKE :search4
            )";
            $params[':searchId'] = is_numeric($cleanedSearch) ? (int)$cleanedSearch : 0;
            $params[':search1'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
            $params[':search3'] = "%{$search}%";
            $params[':search4'] = "%{$search}%";
        }

        // 2. Status Filter
        if ($status !== '' && strtolower($status) !== 'all') {
            $normalizedStatus = strtoupper(str_replace(' ', '_', $status));
            $where[] = "o.order_status = :status";
            $params[':status'] = $normalizedStatus;
        }

        // 3. Payment Status Filter
        if ($paymentStatus !== '' && strtolower($paymentStatus) !== 'all') {
            $normalizedPaymentStatus = strtoupper($paymentStatus);
            $where[] = "o.payment_status = :payment_status";
            $params[':payment_status'] = $normalizedPaymentStatus;
        }

        // 4. Payment Method Filter
        if ($paymentMethod !== '' && strtolower($paymentMethod) !== 'all') {
            $normalizedMethod = strtoupper($paymentMethod);
            $where[] = "o.payment_method = :payment_method";
            $params[':payment_method'] = $normalizedMethod;
        }

        // 5. Date Filter
        if ($dateRange === 'today') {
            $where[] = "DATE(o.created_at) = CURDATE()";
        } else if ($dateRange === 'yesterday') {
            $where[] = "DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
        } else if ($dateRange === 'last_7_days') {
            $where[] = "o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateRange === 'last_30_days') {
            $where[] = "o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        } else if ($dateRange === 'this_month') {
            $where[] = "MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())";
        } else if ($dateRange === 'last_month') {
            $where[] = "o.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
        } else if (!empty($fromDate) && !empty($toDate)) {
            $where[] = "DATE(o.created_at) BETWEEN :fromDate AND :toDate";
            $params[':fromDate'] = $fromDate;
            $params[':toDate'] = $toDate;
        } else if (!empty($fromDate)) {
            $where[] = "DATE(o.created_at) >= :fromDate";
            $params[':fromDate'] = $fromDate;
        } else if (!empty($toDate)) {
            $where[] = "DATE(o.created_at) <= :toDate";
            $params[':toDate'] = $toDate;
        }

        $whereSql = !empty($where) ? ' WHERE ' . implode(' AND ', $where) : '';

        // 6. Sorting mapping
        $sortMapping = [
            'latest' => 'o.created_at DESC',
            'created_desc' => 'o.created_at DESC',
            'oldest' => 'o.created_at ASC',
            'created_asc' => 'o.created_at ASC',
            'amount_desc' => 'o.total_amount DESC',
            'amount_asc' => 'o.total_amount ASC',
            'customer_asc' => 'u.name ASC',
            'customer_desc' => 'u.name DESC'
        ];
        $orderBySql = $sortMapping[$sort] ?? 'o.created_at DESC';

        try {
            // Count total matching orders
            $countQuery = "
                SELECT COUNT(o.id) as total_count 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                {$whereSql}
            ";
            $countStmt = $this->db->prepare($countQuery);
            foreach ($params as $k => $v) {
                $countStmt->bindValue($k, $v);
            }
            $countStmt->execute();
            $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total_count'];

            // Query orders
            $query = "
                SELECT 
                    o.id,
                    COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as order_number,
                    o.user_id,
                    o.address_id,
                    o.coupon_id,
                    o.subtotal,
                    o.discount_amount,
                    o.shipping_fee,
                    o.total_amount,
                    o.payment_method,
                    o.payment_status,
                    o.order_status,
                    o.inventory_deducted,
                    o.order_notes,
                    o.created_at,
                    o.updated_at,
                    u.name as customer_name,
                    u.email as customer_email,
                    u.phone as customer_phone,
                    (SELECT COUNT(oi.id) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
                    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) as total_units
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                {$whereSql}
                ORDER BY {$orderBySql}
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch sample item titles for quick preview tooltip
            foreach ($orders as &$order) {
                $itemSampleStmt = $this->db->prepare("
                    SELECT product_name, quantity, price 
                    FROM order_items 
                    WHERE order_id = :order_id 
                    LIMIT 3
                ");
                $itemSampleStmt->execute([':order_id' => $order['id']]);
                $order['preview_items'] = $itemSampleStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $summary = $this->calculateSummary();
            $totalPages = $limit > 0 ? (int)ceil($totalCount / $limit) : 1;

            echo json_encode([
                "success" => true,
                "data" => [
                    "orders" => $orders,
                    "pagination" => [
                        "page" => $page,
                        "limit" => $limit,
                        "total" => $totalCount,
                        "totalPages" => $totalPages
                    ],
                    "summary" => $summary
                ]
            ]);

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to load orders: " . $e->getMessage()]);
        }
    }

    private function getMyOrders() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $query = "SELECT o.id, COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as order_number,
                         o.user_id, o.address_id, o.coupon_id, o.subtotal, o.discount_amount, 
                         o.shipping_fee, o.total_amount, o.payment_method, o.payment_status, 
                         o.order_status, o.order_notes, o.created_at, o.updated_at 
                  FROM orders o 
                  WHERE o.user_id = :user_id 
                  ORDER BY o.created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch items for each order
        foreach ($orders as &$order) {
            $itemQuery = "SELECT id, product_id, product_name, quantity, price 
                          FROM order_items 
                          WHERE order_id = :order_id";
            $itemStmt = $this->db->prepare($itemQuery);
            $itemStmt->bindParam(':order_id', $order['id'], PDO::PARAM_INT);
            $itemStmt->execute();
            $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            $order['item_count'] = count($order['items']);
        }

        echo json_encode([
            "success" => true,
            "orders" => $orders,
            "data" => [
                "orders" => $orders
            ]
        ]);
    }

    private function getOrderDetails($orderId) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $isAdmin = in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);

        $query = "
            SELECT 
                o.*,
                COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as order_number,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                c.code as coupon_code,
                c.discount_type as coupon_type,
                c.discount_value as coupon_discount_value
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN coupons c ON o.coupon_id = c.id
            WHERE o.id = :id
            LIMIT 1
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Order not found."]);
            return;
        }

        // Authorization check: Verify ownership or admin privileges
        if ((int)$order['user_id'] !== $userId && !$isAdmin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "You are not authorized to view this order."]);
            return;
        }

        // Fetch items with current product metadata
        $itemQuery = "
            SELECT 
                oi.id, 
                oi.order_id, 
                oi.product_id, 
                oi.product_name, 
                oi.quantity, 
                oi.price, 
                ROUND(oi.quantity * oi.price, 2) as total_price,
                p.sku,
                p.image,
                p.stock_quantity as current_stock,
                cat.name as category_name
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories cat ON p.category_id = cat.id
            WHERE oi.order_id = :order_id
        ";
        $itemStmt = $this->db->prepare($itemQuery);
        $itemStmt->bindParam(':order_id', $order['id'], PDO::PARAM_INT);
        $itemStmt->execute();
        $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch address
        if (!empty($order['address_id'])) {
            $addrQuery = "SELECT * FROM addresses WHERE id = :address_id LIMIT 1";
            $addrStmt = $this->db->prepare($addrQuery);
            $addrStmt->bindParam(':address_id', $order['address_id'], PDO::PARAM_INT);
            $addrStmt->execute();
            $order['shipping_address'] = $addrStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (empty($order['shipping_address'])) {
            $order['shipping_address'] = [
                'name' => $order['customer_name'] ?? 'Valued Customer',
                'phone' => $order['customer_phone'] ?? '',
                'address_line1' => $order['order_notes'] ? substr($order['order_notes'], 0, 80) : 'Primary Shipping Address',
                'city' => 'Bhubaneswar',
                'state' => 'Odisha',
                'postal_code' => '751024',
                'country' => 'India'
            ];
        }

        // Fetch status history timeline
        $histQuery = "
            SELECT 
                osh.id, 
                osh.status, 
                osh.notes, 
                osh.created_at, 
                u.name as admin_name
            FROM order_status_history osh
            LEFT JOIN users u ON osh.admin_id = u.id
            WHERE osh.order_id = :order_id
            ORDER BY osh.created_at ASC
        ";
        $histStmt = $this->db->prepare($histQuery);
        $histStmt->execute([':order_id' => $order['id']]);
        $order['status_history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "order" => $order,
            "data" => $order
        ]);
    }

    private function getOrderHistory($orderId) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $query = "
            SELECT 
                osh.id, 
                osh.status, 
                osh.notes, 
                osh.created_at, 
                u.name as admin_name,
                u.email as admin_email
            FROM order_status_history osh
            LEFT JOIN users u ON osh.admin_id = u.id
            WHERE osh.order_id = :order_id
            ORDER BY osh.created_at ASC
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':order_id' => $orderId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "data" => $history]);
    }

    private function updateOrderStatus($orderId) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $newStatus = trim($data['order_status'] ?? ($data['status'] ?? ''));
        $notes = trim($data['notes'] ?? 'Status updated by admin');
        $adminId = (int)$currentUser['id'];

        if (empty($newStatus)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New status required."]);
            return;
        }

        $normalizedNewStatus = strtoupper(str_replace(' ', '_', $newStatus));

        if ($normalizedNewStatus === 'CANCELLED') {
            $this->cancelOrder($orderId);
            return;
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT * FROM orders WHERE id = :id FOR UPDATE");
            $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
            $stmt->execute();
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Order not found."]);
                return;
            }

            $currentStatus = $order['order_status'];
            $inventoryDeducted = (int)($order['inventory_deducted'] ?? 1);

            if ($currentStatus === $normalizedNewStatus) {
                $this->db->rollBack();
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Order #{$orderId} is already in {$currentStatus} status."]);
                return;
            }

            // Valid status transition rules
            $validTransitions = [
                'PENDING' => ['CONFIRMED', 'CANCELLED'],
                'CONFIRMED' => ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
                'PROCESSING' => ['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
                'PACKED' => ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
                'SHIPPED' => ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
                'OUT_FOR_DELIVERY' => ['DELIVERED', 'RETURNED'],
                'DELIVERED' => ['RETURNED', 'REFUNDED'],
                'CANCELLED' => [],
                'RETURNED' => ['REFUNDED'],
                'REFUNDED' => []
            ];

            if (!isset($validTransitions[$currentStatus]) || !in_array($normalizedNewStatus, $validTransitions[$currentStatus])) {
                $this->db->rollBack();
                http_response_code(400);
                $allowedList = !empty($validTransitions[$currentStatus]) 
                    ? implode(', ', $validTransitions[$currentStatus]) 
                    : 'None (Terminal state)';
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid status transition from {$currentStatus} to {$normalizedNewStatus}. Allowed next status: {$allowedList}."
                ]);
                return;
            }

            // Exactly-once stock deduction logic
            // If inventory was NOT previously deducted (e.g. pending prescription review) and now being confirmed/processed:
            if ($inventoryDeducted === 0 && in_array($normalizedNewStatus, ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'])) {
                $itemsStmt = $this->db->prepare("SELECT product_id, quantity, product_name FROM order_items WHERE order_id = :id");
                $itemsStmt->execute([':id' => $orderId]);
                $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

                $stockUpdateStmt = $this->db->prepare("UPDATE products SET stock_quantity = stock_quantity - :qty, updated_at = NOW() WHERE id = :id");
                $transStmt = $this->db->prepare("
                    INSERT INTO inventory_transactions 
                    (product_id, type, quantity, previous_stock, new_stock, reason, notes, admin_id) 
                    VALUES (:product_id, 'Order', :quantity, :prev, :new, :reason, :notes, :admin_id)
                ");

                foreach ($items as $item) {
                    $pId = (int)$item['product_id'];
                    $qty = (int)$item['quantity'];

                    $pStmt = $this->db->prepare("SELECT stock_quantity FROM products WHERE id = :id FOR UPDATE");
                    $pStmt->execute([':id' => $pId]);
                    $prod = $pStmt->fetch(PDO::FETCH_ASSOC);

                    if ($prod) {
                        $prev = (int)$prod['stock_quantity'];
                        $new = max(0, $prev - $qty);
                        $stockUpdateStmt->execute([':qty' => $qty, ':id' => $pId]);
                        $transStmt->execute([
                            ':product_id' => $pId,
                            ':quantity' => $qty,
                            ':prev' => $prev,
                            ':new' => $new,
                            ':reason' => "Order Confirmed (ORD-{$orderId})",
                            ':notes' => "Stock deducted upon status update to {$normalizedNewStatus}",
                            ':admin_id' => $adminId
                        ]);
                    }
                }

                $inventoryDeducted = 1;
            }

            // Update order status
            $updQuery = "UPDATE orders SET order_status = :status, inventory_deducted = :inv, updated_at = NOW() WHERE id = :id";
            $updStmt = $this->db->prepare($updQuery);
            $updStmt->execute([
                ':status' => $normalizedNewStatus,
                ':inv' => $inventoryDeducted,
                ':id' => $orderId
            ]);

            // If delivered and was COD, automatically mark payment as PAID
            if ($normalizedNewStatus === 'DELIVERED' && $order['payment_method'] === 'COD') {
                $payStmt = $this->db->prepare("UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = :id");
                $payStmt->execute([':id' => $orderId]);
            }

            // Record in order status history (with both old_status and new status)
            $histStmt = $this->db->prepare("
                INSERT INTO order_status_history (order_id, old_status, status, notes, admin_id, created_at) 
                VALUES (:order_id, :old_status, :status, :notes, :admin_id, NOW())
            ");
            $histStmt->execute([
                ':order_id' => $orderId,
                ':old_status' => $currentStatus,
                ':status' => $normalizedNewStatus,
                ':notes' => $notes,
                ':admin_id' => $adminId
            ]);

            // Fetch complete updated order details
            $fetchStmt = $this->db->prepare("
                SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone 
                FROM orders o 
                LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.id = :id
            ");
            $fetchStmt->execute([':id' => $orderId]);
            $updatedOrder = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            $this->db->commit();

            try {
                require_once __DIR__ . '/../services/NotificationService.php';
                $notifService = new NotificationService($this->db);
                $orderNumber = !empty($updatedOrder['order_number']) ? $updatedOrder['order_number'] : ('ORD-' . $orderId);
                $notifService->notifyOrderStatusChanged($orderId, $orderNumber, $currentStatus, $normalizedNewStatus);
            } catch (Exception $notifEx) {
                error_log("Failed to trigger order status notification: " . $notifEx->getMessage());
            }

            $summary = $this->calculateSummary();

            echo json_encode([
                "success" => true,
                "message" => "Order status updated successfully",
                "data" => [
                    "order" => $updatedOrder,
                    "summary" => $summary
                ],
                "order" => $updatedOrder,
                "summary" => $summary
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update order status: " . $e->getMessage()]);
        }
    }

    private function updatePaymentStatus($orderId) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $paymentStatus = trim($data['payment_status'] ?? '');

        if (empty($paymentStatus)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Payment status required."]);
            return;
        }

        $normalizedPaymentStatus = strtoupper($paymentStatus);

        try {
            $stmt = $this->db->prepare("UPDATE orders SET payment_status = :status, updated_at = NOW() WHERE id = :id");
            $stmt->execute([':status' => $normalizedPaymentStatus, ':id' => $orderId]);

            // Add note to status history
            $histStmt = $this->db->prepare("
                INSERT INTO order_status_history (order_id, status, notes, admin_id, created_at) 
                VALUES (:order_id, (SELECT order_status FROM orders WHERE id = :id2), :notes, :admin_id, NOW())
            ");
            $histStmt->execute([
                ':order_id' => $orderId,
                ':id2' => $orderId,
                ':notes' => "Payment status updated to {$normalizedPaymentStatus}",
                ':admin_id' => (int)$currentUser['id']
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Payment status updated to {$normalizedPaymentStatus}."
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function cancelOrder($orderId) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $isAdmin = in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $reason = trim($data['reason'] ?? ($data['notes'] ?? 'Order cancelled by customer or admin'));

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT * FROM orders WHERE id = :id FOR UPDATE");
            $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
            $stmt->execute();
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Order not found."]);
                return;
            }

            if ((int)$order['user_id'] !== $userId && !$isAdmin) {
                $this->db->rollBack();
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "Unauthorized to cancel this order."]);
                return;
            }

            if ($order['order_status'] === 'CANCELLED') {
                $this->db->rollBack();
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Order is already cancelled."]);
                return;
            }

            // Update order status and set payment to REFUNDED if was paid
            $newPaymentStatus = $order['payment_status'] === 'PAID' ? 'REFUNDED' : $order['payment_status'];
            $inventoryDeducted = (int)($order['inventory_deducted'] ?? 1);

            $updOrder = $this->db->prepare("
                UPDATE orders 
                SET order_status = 'CANCELLED', payment_status = :pstatus, inventory_deducted = 0, updated_at = NOW() 
                WHERE id = :id
            ");
            $updOrder->execute([
                ':pstatus' => $newPaymentStatus,
                ':id' => $orderId
            ]);

            // Exactly-once stock restoration:
            // Only restore if inventory was deducted
            if ($inventoryDeducted === 1) {
                $itemsStmt = $this->db->prepare("SELECT product_id, quantity, product_name FROM order_items WHERE order_id = :id");
                $itemsStmt->execute([':id' => $orderId]);
                $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

                $orderNumber = $order['order_number'] ?: ('ORD-' . str_pad($orderId, 4, '0', STR_PAD_LEFT));
                $adminId = $isAdmin ? $userId : null;

                $stockRestoreStmt = $this->db->prepare("UPDATE products SET stock_quantity = stock_quantity + :qty, updated_at = NOW() WHERE id = :id");
                $transStmt = $this->db->prepare("
                    INSERT INTO inventory_transactions 
                    (product_id, type, quantity, previous_stock, new_stock, reason, notes, admin_id) 
                    VALUES (:product_id, 'Order Cancellation', :quantity, :prev, :new, :reason, :notes, :admin_id)
                ");

                foreach ($orderItems as $item) {
                    $pId = (int)$item['product_id'];
                    $qty = (int)$item['quantity'];

                    $pStmt = $this->db->prepare("SELECT stock_quantity FROM products WHERE id = :id FOR UPDATE");
                    $pStmt->execute([':id' => $pId]);
                    $cur = $pStmt->fetch(PDO::FETCH_ASSOC);

                    if ($cur) {
                        $prevStock = (int)$cur['stock_quantity'];
                        $newStock = $prevStock + $qty;

                        $stockRestoreStmt->execute([':qty' => $qty, ':id' => $pId]);

                        $transStmt->execute([
                            ':product_id' => $pId,
                            ':quantity' => $qty,
                            ':prev' => $prevStock,
                            ':new' => $newStock,
                            ':reason' => "Order Cancelled ({$orderNumber})",
                            ':notes' => $reason,
                            ':admin_id' => $adminId
                        ]);
                    }
                }
            }

            // Log in status history
            $histStmt = $this->db->prepare("
                INSERT INTO order_status_history (order_id, status, notes, admin_id, created_at) 
                VALUES (:order_id, 'CANCELLED', :notes, :admin_id, NOW())
            ");
            $histStmt->execute([
                ':order_id' => $orderId,
                ':notes' => $reason,
                ':admin_id' => $isAdmin ? $userId : null
            ]);

            $this->db->commit();

            $summary = $this->calculateSummary();

            echo json_encode([
                "success" => true,
                "message" => "Order #{$orderId} was cancelled successfully and stock was restored.",
                "summary" => $summary
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Order cancellation error: " . $e->getMessage()]);
        }
    }

    private function createOrder() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $items = $data['items'] ?? [];
        if (is_string($items)) {
            $items = json_decode($items, true) ?: [];
        }

        if (empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Order must contain at least one item."]);
            return;
        }

        try {
            $this->db->beginTransaction();

            // 1. Validate real stock in database and prevent overselling
            $verifiedItems = [];
            foreach ($items as $item) {
                $productId = (int)($item['productId'] ?? ($item['id'] ?? 0));
                $qty = (int)($item['quantity'] ?? 1);

                if ($productId <= 0 || $qty <= 0) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Invalid product or quantity in order."]);
                    return;
                }

                // Row-lock product to verify live stock
                $stmt = $this->db->prepare("SELECT id, name, stock_quantity, price, sale_price FROM products WHERE id = :id FOR UPDATE");
                $stmt->bindParam(':id', $productId, PDO::PARAM_INT);
                $stmt->execute();
                $prod = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$prod) {
                    $this->db->rollBack();
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "Product with ID {$productId} was not found."]);
                    return;
                }

                $availableStock = (int)$prod['stock_quantity'];
                if ($availableStock < $qty) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode([
                        "success" => false, 
                        "message" => "Only {$availableStock} units of '{$prod['name']}' are currently available in stock."
                    ]);
                    return;
                }

                $effectivePrice = !empty($prod['sale_price']) && (float)$prod['sale_price'] > 0 
                    ? (float)$prod['sale_price'] 
                    : (float)$prod['price'];

                $verifiedItems[] = [
                    'id' => $prod['id'],
                    'name' => $prod['name'],
                    'quantity' => $qty,
                    'price' => $effectivePrice,
                    'current_stock' => $availableStock
                ];
            }

            // 2. Calculate subtotal & shipping
            $subtotal = 0;
            foreach ($verifiedItems as $vItem) {
                $subtotal += $vItem['price'] * $vItem['quantity'];
            }
            $shippingFee = $subtotal > 500 ? 0.00 : 50.00;
            
            // Server-side Coupon Revalidation & Concurrency Protection
            $couponId = isset($data['coupon_id']) ? (int)$data['coupon_id'] : null;
            $couponCode = trim($data['coupon_code'] ?? ($data['coupon'] ?? ''));
            $discountAmount = 0.00;

            if ($couponId || !empty($couponCode)) {
                $couponQuery = "SELECT * FROM coupons WHERE (id = :cid OR code = :code) AND deleted_at IS NULL LIMIT 1 FOR UPDATE";
                $cStmt = $this->db->prepare($couponQuery);
                $cStmt->execute([
                    ':cid' => $couponId ?: 0,
                    ':code' => strtoupper($couponCode)
                ]);
                $coupon = $cStmt->fetch(PDO::FETCH_ASSOC);

                if ($coupon && $coupon['status'] === 'ACTIVE') {
                    $now = time();
                    $isStarted = empty($coupon['start_date']) || strtotime($coupon['start_date']) <= $now;
                    $isNotExpired = empty($coupon['expiry_date']) || strtotime($coupon['expiry_date']) >= $now;

                    // Overall usage limit check
                    $usageLimitOk = true;
                    if (!empty($coupon['usage_limit'])) {
                        $uStmt = $this->db->prepare("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = :id");
                        $uStmt->execute([':id' => $coupon['id']]);
                        if ((int)$uStmt->fetchColumn() >= (int)$coupon['usage_limit']) {
                            $usageLimitOk = false;
                        }
                    }

                    // Per user limit check
                    $perUserOk = true;
                    if (!empty($coupon['per_user_limit'])) {
                        $puStmt = $this->db->prepare("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = :id AND user_id = :uid");
                        $puStmt->execute([':id' => $coupon['id'], ':uid' => $userId]);
                        if ((int)$puStmt->fetchColumn() >= (int)$coupon['per_user_limit']) {
                            $perUserOk = false;
                        }
                    }

                    // Min order check
                    $minOrderOk = $subtotal >= (float)$coupon['min_order_amount'];

                    if ($isStarted && $isNotExpired && $usageLimitOk && $perUserOk && $minOrderOk) {
                        $couponId = (int)$coupon['id'];
                        if ($coupon['discount_type'] === 'PERCENTAGE') {
                            $discountAmount = ($subtotal * (float)$coupon['discount_value']) / 100;
                            if (!empty($coupon['max_discount_amount']) && $discountAmount > (float)$coupon['max_discount_amount']) {
                                $discountAmount = (float)$coupon['max_discount_amount'];
                            }
                        } else {
                            $discountAmount = min($subtotal, (float)$coupon['discount_value']);
                        }
                        $discountAmount = round($discountAmount, 2);
                    } else {
                        $couponId = null;
                        $discountAmount = 0.00;
                    }
                } else {
                    $couponId = null;
                    $discountAmount = 0.00;
                }
            }

            $totalAmount = max(0, $subtotal + $shippingFee - $discountAmount);
            $paymentMethod = strtoupper($data['paymentMethod'] ?? ($data['payment_method'] ?? 'COD'));
            $paymentStatus = ($paymentMethod === 'ONLINE' || $paymentMethod === 'RAZORPAY') ? 'PAID' : 'PENDING';
            $orderNotes = trim($data['order_notes'] ?? ($data['address'] ?? ''));
            $addressId = isset($data['address_id']) ? (int)$data['address_id'] : null;

            // 3. Insert order with inventory_deducted = 1
            $query = "
                INSERT INTO orders 
                (user_id, address_id, coupon_id, subtotal, discount_amount, shipping_fee, total_amount, payment_method, payment_status, order_status, inventory_deducted, order_notes) 
                VALUES (:user_id, :address_id, :coupon_id, :subtotal, :discount_amount, :shipping_fee, :total_amount, :payment_method, :payment_status, 'CONFIRMED', 1, :order_notes)
            ";
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                ':user_id' => $userId,
                ':address_id' => $addressId,
                ':coupon_id' => $couponId,
                ':subtotal' => $subtotal,
                ':discount_amount' => $discountAmount,
                ':shipping_fee' => $shippingFee,
                ':total_amount' => $totalAmount,
                ':payment_method' => $paymentMethod,
                ':payment_status' => $paymentStatus,
                ':order_notes' => $orderNotes
            ]);

            $orderId = (int)$this->db->lastInsertId();
            $orderNumber = 'ORD-' . str_pad($orderId, 4, '0', STR_PAD_LEFT);

            // Update order_number field
            $numStmt = $this->db->prepare("UPDATE orders SET order_number = :num WHERE id = :id");
            $numStmt->execute([':num' => $orderNumber, ':id' => $orderId]);

            // Record coupon usage if coupon applied
            if ($couponId && $discountAmount > 0) {
                $usageIns = $this->db->prepare("
                    INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount, created_at)
                    VALUES (:cid, :uid, :oid, :disc, NOW())
                ");
                $usageIns->execute([
                    ':cid' => $couponId,
                    ':uid' => $userId,
                    ':oid' => $orderId,
                    ':disc' => $discountAmount
                ]);
            }

            // 4. Insert items, deduct inventory, and record transaction
            $itemStmt = $this->db->prepare("
                INSERT INTO order_items (order_id, product_id, product_name, quantity, price) 
                VALUES (:order_id, :product_id, :product_name, :quantity, :price)
            ");

            $stockUpdateStmt = $this->db->prepare("
                UPDATE products 
                SET stock_quantity = stock_quantity - :qty, updated_at = NOW() 
                WHERE id = :id
            ");

            $transStmt = $this->db->prepare("
                INSERT INTO inventory_transactions 
                (product_id, type, quantity, previous_stock, new_stock, reason, notes, admin_id) 
                VALUES (:product_id, 'Order', :quantity, :prev, :new, :reason, :notes, NULL)
            ");

            foreach ($verifiedItems as $vItem) {
                $pId = $vItem['id'];
                $pName = $vItem['name'];
                $qty = $vItem['quantity'];
                $price = $vItem['price'];
                $prevStock = $vItem['current_stock'];
                $newStock = $prevStock - $qty;

                // Save order item
                $itemStmt->execute([
                    ':order_id' => $orderId,
                    ':product_id' => $pId,
                    ':product_name' => $pName,
                    ':quantity' => $qty,
                    ':price' => $price
                ]);

                // Deduct stock in products table
                $stockUpdateStmt->execute([
                    ':qty' => $qty,
                    ':id' => $pId
                ]);

                // Record inventory transaction
                $transStmt->execute([
                    ':product_id' => $pId,
                    ':quantity' => $qty,
                    ':prev' => $prevStock,
                    ':new' => $newStock,
                    ':reason' => "Order Placed ({$orderNumber})",
                    ':notes' => "Automated checkout deduction for Order #{$orderId}"
                ]);
            }

            // 5. Insert initial status history
            $histStmt = $this->db->prepare("
                INSERT INTO order_status_history (order_id, status, notes, admin_id, created_at) 
                VALUES (:order_id, 'CONFIRMED', 'Order placed successfully by customer', NULL, NOW())
            ");
            $histStmt->execute([':order_id' => $orderId]);

            // 6. Link prescription if prescription_id was provided
            if (!empty($data['prescription_id'])) {
                $rxId = (int)$data['prescription_id'];
                $rxStmt = $this->db->prepare("
                    UPDATE prescriptions 
                    SET order_id = :order_id, updated_at = NOW() 
                    WHERE id = :rx_id AND (user_id = :user_id OR :is_admin = 1)
                ");
                $rxStmt->execute([
                    ':order_id' => $orderId,
                    ':rx_id' => $rxId,
                    ':user_id' => $userId,
                    ':is_admin' => in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']) ? 1 : 0
                ]);
            }

            $this->db->commit();

            try {
                require_once __DIR__ . '/../services/NotificationService.php';
                $notifService = new NotificationService($this->db);
                $notifService->notifyOrderCreated($orderId, $orderNumber, $currentUser['name'] ?? 'Customer', $totalAmount);
            } catch (Exception $notifEx) {
                error_log("Failed to trigger order notification: " . $notifEx->getMessage());
            }

            echo json_encode([
                "success" => true,
                "message" => "Order placed successfully",
                "order_id" => $orderId,
                "order_number" => $orderNumber
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Order placement error: " . $e->getMessage()]);
        }
    }

    private function exportOrders() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $paymentStatus = trim($_GET['payment_status'] ?? '');
        $paymentMethod = trim($_GET['payment_method'] ?? '');
        $dateRange = trim($_GET['date_range'] ?? '');
        $fromDate = trim($_GET['from_date'] ?? '');
        $toDate = trim($_GET['to_date'] ?? '');

        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = "(o.order_number LIKE :s1 OR u.name LIKE :s2 OR u.email LIKE :s3)";
            $params[':s1'] = "%{$search}%";
            $params[':s2'] = "%{$search}%";
            $params[':s3'] = "%{$search}%";
        }

        if ($status !== '' && strtolower($status) !== 'all') {
            $where[] = "o.order_status = :status";
            $params[':status'] = strtoupper($status);
        }

        if ($paymentStatus !== '' && strtolower($paymentStatus) !== 'all') {
            $where[] = "o.payment_status = :pstatus";
            $params[':pstatus'] = strtoupper($paymentStatus);
        }

        if ($paymentMethod !== '' && strtolower($paymentMethod) !== 'all') {
            $where[] = "o.payment_method = :pmethod";
            $params[':pmethod'] = strtoupper($paymentMethod);
        }

        if (!empty($fromDate) && !empty($toDate)) {
            $where[] = "DATE(o.created_at) BETWEEN :fromD AND :toD";
            $params[':fromD'] = $fromDate;
            $params[':toD'] = $toDate;
        }

        $whereSql = !empty($where) ? ' WHERE ' . implode(' AND ', $where) : '';

        $query = "
            SELECT 
                COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as 'Order Number',
                u.name as 'Customer Name',
                u.email as 'Customer Email',
                u.phone as 'Phone',
                DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') as 'Date',
                (SELECT COUNT(oi.id) FROM order_items oi WHERE oi.order_id = o.id) as 'Items Count',
                o.subtotal as 'Subtotal',
                o.discount_amount as 'Discount',
                o.shipping_fee as 'Shipping',
                o.total_amount as 'Total Amount',
                o.payment_method as 'Payment Method',
                o.payment_status as 'Payment Status',
                o.order_status as 'Order Status'
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            {$whereSql}
            ORDER BY o.created_at DESC
        ";

        try {
            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $exportData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $exportData]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to export orders: " . $e->getMessage()]);
        }
    }
}
?>
