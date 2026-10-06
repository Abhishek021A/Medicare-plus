<?php
// backend/controllers/CustomerController.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class CustomerController {
    private $db;
    private $method;
    private $id;
    private $subAction;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function processRequest() {
        if ($this->method === 'POST' && isset($_POST['_method']) && in_array(strtoupper($_POST['_method']), ['PUT', 'PATCH'])) {
            $this->method = strtoupper($_POST['_method']);
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'summary') {
                    $this->getSummary();
                } else if ($this->id === 'export') {
                    $this->exportCustomers();
                } else if ($this->id) {
                    if ($this->subAction === 'orders') {
                        $this->getCustomerOrders((int)$this->id);
                    } else if ($this->subAction === 'prescriptions') {
                        $this->getCustomerPrescriptions((int)$this->id);
                    } else if ($this->subAction === 'wishlist') {
                        $this->getCustomerWishlist((int)$this->id);
                    } else if ($this->subAction === 'addresses') {
                        $this->getCustomerAddresses((int)$this->id);
                    } else if ($this->subAction === 'reviews') {
                        $this->getCustomerReviews((int)$this->id);
                    } else {
                        $this->getCustomerDetails((int)$this->id);
                    }
                } else {
                    $this->getAllCustomers();
                }
                break;

            case 'POST':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        $this->updateCustomer((int)$this->id);
                    }
                } else {
                    $this->createCustomer();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        $this->updateCustomer((int)$this->id);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Customer ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function requireAdmin() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER', 'ORDER_MANAGER'];
        if (!in_array($currentUser['role'] ?? '', $allowedRoles)) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            exit();
        }
        return $currentUser;
    }

    private function calculateSummary() {
        // Total customers
        $totalStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'");
        $total = (int)$totalStmt->fetchColumn();

        // Active customers
        $activeStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND status = 'ACTIVE'");
        $active = (int)$activeStmt->fetchColumn();

        // New customers (last 30 days)
        $newStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $new = (int)$newStmt->fetchColumn();

        // Blocked / Suspended / Inactive customers
        $blockedStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND status IN ('BLOCKED', 'INACTIVE')");
        $blocked = (int)$blockedStmt->fetchColumn();

        // Total orders placed by customers
        $ordersStmt = $this->db->query("SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id WHERE u.role = 'CUSTOMER'");
        $orders = (int)$ordersStmt->fetchColumn();

        // Total revenue from customer completed/paid orders
        $revStmt = $this->db->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'PAID'");
        $revenue = (float)$revStmt->fetchColumn();

        return [
            "total" => $total,
            "active" => $active,
            "new" => $new,
            "blocked" => $blocked,
            "orders" => $orders,
            "revenue" => $revenue
        ];
    }

    private function getSummary() {
        $this->requireAdmin();
        $summary = $this->calculateSummary();
        echo json_encode(["success" => true, "data" => $summary]);
    }

    private function getAllCustomers() {
        $this->requireAdmin();

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? ''));
        $dateFilter = trim($_GET['date_filter'] ?? ($_GET['datePreset'] ?? ''));
        $dateFrom = trim($_GET['date_from'] ?? '');
        $dateTo = trim($_GET['date_to'] ?? '');
        $orderActivity = trim($_GET['order_activity'] ?? ($_GET['has_orders'] ?? ''));
        $sort = trim($_GET['sort'] ?? 'newest');

        $where = ["u.role = 'CUSTOMER'"];
        $params = [];

        // Search filter
        if (!empty($search)) {
            // Check if search matches CUS-XXXX format
            $cleanSearch = $search;
            if (preg_match('/^CUS-(\d+)$/i', $search, $m)) {
                $searchId = (int)$m[1];
                $where[] = "(u.id = :searchId OR u.name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)";
                $params[':searchId'] = $searchId;
                $params[':search'] = "%{$cleanSearch}%";
            } else if (is_numeric($search)) {
                $where[] = "(u.id = :searchId OR u.name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)";
                $params[':searchId'] = (int)$search;
                $params[':search'] = "%{$search}%";
            } else {
                $where[] = "(u.name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search)";
                $params[':search'] = "%{$search}%";
            }
        }

        // Status filter
        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'BLOCKED') {
                $where[] = "u.status IN ('BLOCKED', 'INACTIVE')";
            } else {
                $where[] = "u.status = :status";
                $params[':status'] = $status;
            }
        }

        // Date filter
        if ($dateFilter === 'today') {
            $where[] = "DATE(u.created_at) = CURDATE()";
        } else if ($dateFilter === '7days') {
            $where[] = "u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateFilter === '30days') {
            $where[] = "u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        } else if ($dateFilter === 'this_month') {
            $where[] = "YEAR(u.created_at) = YEAR(CURDATE()) AND MONTH(u.created_at) = MONTH(CURDATE())";
        } else if (!empty($dateFrom) && !empty($dateTo)) {
            $where[] = "DATE(u.created_at) BETWEEN :dateFrom AND :dateTo";
            $params[':dateFrom'] = $dateFrom;
            $params[':dateTo'] = $dateTo;
        }

        // Order activity filter
        if ($orderActivity === 'has_orders' || $orderActivity === 'true') {
            $where[] = "COALESCE(ord_agg.order_count, 0) > 0";
        } else if ($orderActivity === 'no_orders' || $orderActivity === 'false') {
            $where[] = "COALESCE(ord_agg.order_count, 0) = 0";
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        // Sorting
        $orderBy = "ORDER BY u.created_at DESC";
        switch ($sort) {
            case 'oldest':
                $orderBy = "ORDER BY u.created_at ASC";
                break;
            case 'name_asc':
                $orderBy = "ORDER BY u.name ASC";
                break;
            case 'name_desc':
                $orderBy = "ORDER BY u.name DESC";
                break;
            case 'spent_desc':
                $orderBy = "ORDER BY total_spent DESC";
                break;
            case 'spent_asc':
                $orderBy = "ORDER BY total_spent ASC";
                break;
            case 'orders_desc':
                $orderBy = "ORDER BY order_count DESC";
                break;
            case 'orders_asc':
                $orderBy = "ORDER BY order_count ASC";
                break;
            case 'newest':
            default:
                $orderBy = "ORDER BY u.created_at DESC";
                break;
        }

        // Base aggregated subqueries
        $fromClause = "
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(id) as order_count, SUM(CASE WHEN payment_status = 'PAID' OR order_status = 'DELIVERED' THEN total_amount ELSE 0 END) as total_spent
                FROM orders
                GROUP BY user_id
            ) ord_agg ON u.id = ord_agg.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(id) as prescription_count
                FROM prescriptions
                GROUP BY user_id
            ) rx_agg ON u.id = rx_agg.user_id
            LEFT JOIN (
                SELECT w.user_id, COUNT(wi.id) as wishlist_count
                FROM wishlists w
                JOIN wishlist_items wi ON w.id = wi.wishlist_id
                GROUP BY w.user_id
            ) wl_agg ON u.id = wl_agg.user_id
        ";

        // Count total matching records
        $countQuery = "SELECT COUNT(*) as total {$fromClause} {$whereClause}";
        $countStmt = $this->db->prepare($countQuery);
        foreach ($params as $k => $v) {
            $countStmt->bindValue($k, $v);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        $totalPages = ceil($total / $limit) ?: 1;

        // Fetch paginated customers
        $selectQuery = "
            SELECT 
                u.id,
                CONCAT('CUS-', LPAD(u.id, 4, '0')) as customer_code,
                u.name,
                u.email,
                u.phone,
                u.status,
                u.created_at,
                u.updated_at,
                COALESCE(ord_agg.order_count, 0) as order_count,
                COALESCE(ord_agg.total_spent, 0.00) as total_spent,
                COALESCE(rx_agg.prescription_count, 0) as prescription_count,
                COALESCE(wl_agg.wishlist_count, 0) as wishlist_count
            {$fromClause}
            {$whereClause}
            {$orderBy}
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($selectQuery);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enhance customer records with initials and name parts
        $customers = array_map(function($row) {
            $name = trim($row['name'] ?? '');
            $parts = explode(' ', $name, 2);
            $row['first_name'] = $parts[0] ?? '';
            $row['last_name'] = $parts[1] ?? '';
            
            // Dynamic initials
            $initials = '';
            if (!empty($row['first_name'])) $initials .= strtoupper(substr($row['first_name'], 0, 1));
            if (!empty($row['last_name'])) $initials .= strtoupper(substr($row['last_name'], 0, 1));
            if (empty($initials) && !empty($name)) $initials = strtoupper(substr($name, 0, 2));
            $row['initials'] = $initials ?: 'CU';

            $row['total_spent'] = number_format((float)$row['total_spent'], 2, '.', '');
            $row['order_count'] = (int)$row['order_count'];
            $row['prescription_count'] = (int)$row['prescription_count'];
            $row['wishlist_count'] = (int)$row['wishlist_count'];
            return $row;
        }, $rows);

        $summary = $this->calculateSummary();

        echo json_encode([
            "success" => true,
            "data" => [
                "customers" => $customers,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $totalPages
                ],
                "summary" => $summary
            ],
            // Compatibility direct properties
            "customers" => $customers,
            "pagination" => [
                "page" => $page,
                "limit" => $limit,
                "total" => $total,
                "totalPages" => $totalPages
            ],
            "summary" => $summary
        ]);
    }

    private function getCustomerDetails($id) {
        $this->requireAdmin();

        // Fetch base user
        $userStmt = $this->db->prepare("
            SELECT id, name, email, phone, role, status, created_at, updated_at
            FROM users
            WHERE id = :id AND role = 'CUSTOMER'
            LIMIT 1
        ");
        $userStmt->execute([':id' => $id]);
        $customer = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$customer) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Customer not found."]);
            return;
        }

        $customer['customer_code'] = 'CUS-' . str_pad($customer['id'], 4, '0', STR_PAD_LEFT);
        $nameParts = explode(' ', trim($customer['name'] ?? ''), 2);
        $customer['first_name'] = $nameParts[0] ?? '';
        $customer['last_name'] = $nameParts[1] ?? '';

        $initials = '';
        if (!empty($customer['first_name'])) $initials .= strtoupper(substr($customer['first_name'], 0, 1));
        if (!empty($customer['last_name'])) $initials .= strtoupper(substr($customer['last_name'], 0, 1));
        if (empty($initials) && !empty($customer['name'])) $initials = strtoupper(substr($customer['name'], 0, 2));
        $customer['initials'] = $initials ?: 'CU';

        // Fetch addresses
        $addrStmt = $this->db->prepare("
            SELECT id, address_line_1, address_line_2, city, state, pin_code, landmark, is_default, created_at
            FROM addresses
            WHERE user_id = :id
            ORDER BY is_default DESC, id DESC
        ");
        $addrStmt->execute([':id' => $id]);
        $addresses = $addrStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch orders
        $ordersStmt = $this->db->prepare("
            SELECT 
                o.id,
                COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as order_number,
                o.subtotal,
                o.discount_amount,
                o.shipping_fee,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            WHERE o.user_id = :id
            ORDER BY o.created_at DESC
        ");
        $ordersStmt->execute([':id' => $id]);
        $orders = $ordersStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch prescriptions
        $rxStmt = $this->db->prepare("
            SELECT 
                p.id,
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as prescription_number,
                p.order_id,
                p.file_path,
                p.original_filename,
                p.status,
                p.rejection_reason,
                p.customer_message,
                p.admin_notes,
                p.reviewed_by,
                p.reviewed_at,
                p.created_at,
                rev.name as reviewer_name,
                o.order_number
            FROM prescriptions p
            LEFT JOIN users rev ON p.reviewed_by = rev.id
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE p.user_id = :id
            ORDER BY p.created_at DESC
        ");
        $rxStmt->execute([':id' => $id]);
        $prescriptions = $rxStmt->fetchAll(PDO::FETCH_ASSOC);

        $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";
        $prescriptions = array_map(function($p) use ($baseUrl) {
            $p['file_url'] = $baseUrl . ltrim($p['file_path'] ?? '', '/');
            return $p;
        }, $prescriptions);

        // Fetch wishlist items
        $wlStmt = $this->db->prepare("
            SELECT 
                wi.id as wishlist_item_id,
                p.id as product_id,
                p.name as product_name,
                p.slug as product_slug,
                p.sku,
                p.price,
                p.sale_price,
                p.stock_quantity,
                p.image,
                wi.created_at as added_at
            FROM wishlists w
            JOIN wishlist_items wi ON w.id = wi.wishlist_id
            JOIN products p ON wi.product_id = p.id
            WHERE w.user_id = :id
            ORDER BY wi.created_at DESC
        ");
        $wlStmt->execute([':id' => $id]);
        $wishlist = $wlStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch reviews
        $revStmt = $this->db->prepare("
            SELECT 
                r.id,
                r.product_id,
                p.name as product_name,
                p.image as product_image,
                r.rating,
                r.title,
                r.comment,
                r.status,
                r.verified_purchase,
                r.created_at
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE r.user_id = :id AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        ");
        $revStmt->execute([':id' => $id]);
        $reviews = $revStmt->fetchAll(PDO::FETCH_ASSOC);

        // Statistics
        $totalOrders = count($orders);
        $completedOrders = 0;
        $pendingOrders = 0;
        $totalSpent = 0.00;

        foreach ($orders as $ord) {
            if ($ord['order_status'] === 'DELIVERED') {
                $completedOrders++;
            } else if (in_array($ord['order_status'], ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'PRESCRIPTION_REVIEW'])) {
                $pendingOrders++;
            }
            if ($ord['payment_status'] === 'PAID' || $ord['order_status'] === 'DELIVERED') {
                $totalSpent += (float)$ord['total_amount'];
            }
        }

        $statistics = [
            "total_orders" => $totalOrders,
            "completed_orders" => $completedOrders,
            "pending_orders" => $pendingOrders,
            "total_spent" => number_format($totalSpent, 2, '.', ''),
            "wishlist_items" => count($wishlist),
            "prescriptions" => count($prescriptions),
            "reviews_count" => count($reviews)
        ];

        $payload = [
            "customer" => $customer,
            "statistics" => $statistics,
            "addresses" => $addresses,
            "orders" => $orders,
            "prescriptions" => $prescriptions,
            "wishlist" => $wishlist,
            "reviews" => $reviews
        ];

        echo json_encode([
            "success" => true,
            "data" => $payload,
            "customer" => $customer,
            "statistics" => $statistics,
            "addresses" => $addresses,
            "orders" => $orders,
            "prescriptions" => $prescriptions,
            "wishlist" => $wishlist,
            "reviews" => $reviews
        ]);
    }

    private function updateStatus($id) {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $status = strtoupper(trim($data['status'] ?? ''));

        if (!in_array($status, ['ACTIVE', 'BLOCKED', 'INACTIVE'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status. Allowed values: ACTIVE, BLOCKED, INACTIVE."]);
            return;
        }

        $checkStmt = $this->db->prepare("SELECT id, status, name, email FROM users WHERE id = :id AND role = 'CUSTOMER'");
        $checkStmt->execute([':id' => $id]);
        $user = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Customer not found."]);
            return;
        }

        $stmt = $this->db->prepare("UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id");
        $stmt->execute([
            ':status' => $status,
            ':id' => $id
        ]);

        $summary = $this->calculateSummary();

        echo json_encode([
            "success" => true,
            "message" => "Customer " . ($status === 'BLOCKED' ? "blocked" : "status updated") . " successfully.",
            "data" => [
                "id" => $id,
                "status" => $status,
                "summary" => $summary
            ],
            "status" => $status,
            "summary" => $summary
        ]);
    }

    private function updateCustomer($id) {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

        $checkStmt = $this->db->prepare("SELECT * FROM users WHERE id = :id AND role = 'CUSTOMER'");
        $checkStmt->execute([':id' => $id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Customer not found."]);
            return;
        }

        // Name handling: either 'name' or 'first_name' + 'last_name'
        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $name = trim($data['name'] ?? '');

        if (empty($name)) {
            if (!empty($firstName)) {
                $name = $firstName . (!empty($lastName) ? ' ' . $lastName : '');
            } else {
                $name = $existing['name'];
            }
        }

        $email = trim(strtolower($data['email'] ?? $existing['email']));
        $phone = trim($data['phone'] ?? $existing['phone']);
        $status = strtoupper(trim($data['status'] ?? $existing['status']));

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Customer name is required."]);
            return;
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "A valid email address is required."]);
            return;
        }

        // Email uniqueness validation
        $uniqueStmt = $this->db->prepare("SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1");
        $uniqueStmt->execute([':email' => $email, ':id' => $id]);
        if ($uniqueStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "This email address is already in use by another account."]);
            return;
        }

        if (!in_array($status, ['ACTIVE', 'BLOCKED', 'INACTIVE'])) {
            $status = $existing['status'];
        }

        $updateStmt = $this->db->prepare("
            UPDATE users 
            SET name = :name, email = :email, phone = :phone, status = :status, updated_at = NOW() 
            WHERE id = :id
        ");
        $updateStmt->execute([
            ':name' => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':status' => $status,
            ':id' => $id
        ]);

        // Refetch updated record
        $fetchStmt = $this->db->prepare("SELECT id, name, email, phone, role, status, created_at, updated_at FROM users WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $updated = $fetchStmt->fetch(PDO::FETCH_ASSOC);
        $updated['customer_code'] = 'CUS-' . str_pad($updated['id'], 4, '0', STR_PAD_LEFT);

        $nameParts = explode(' ', trim($updated['name']), 2);
        $updated['first_name'] = $nameParts[0] ?? '';
        $updated['last_name'] = $nameParts[1] ?? '';

        echo json_encode([
            "success" => true,
            "message" => "Customer updated successfully.",
            "data" => $updated,
            "customer" => $updated
        ]);
    }

    private function exportCustomers() {
        $this->requireAdmin();

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? ''));

        $where = ["u.role = 'CUSTOMER'"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(u.name LIKE :search OR u.email LIKE :search OR u.phone LIKE :search OR u.id = :searchId)";
            $params[':search'] = "%{$search}%";
            $params[':searchId'] = (int)$search;
        }

        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'BLOCKED') {
                $where[] = "u.status IN ('BLOCKED', 'INACTIVE')";
            } else {
                $where[] = "u.status = :status";
                $params[':status'] = $status;
            }
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $query = "
            SELECT 
                u.id,
                CONCAT('CUS-', LPAD(u.id, 4, '0')) as customer_code,
                u.name,
                u.email,
                u.phone,
                u.status,
                u.created_at,
                COALESCE(ord_agg.order_count, 0) as order_count,
                COALESCE(ord_agg.total_spent, 0.00) as total_spent
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(id) as order_count, SUM(CASE WHEN payment_status = 'PAID' OR order_status = 'DELIVERED' THEN total_amount ELSE 0 END) as total_spent
                FROM orders
                GROUP BY user_id
            ) ord_agg ON u.id = ord_agg.user_id
            {$whereClause}
            ORDER BY u.created_at DESC
        ";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Clean customer records for export (never export passwords, hashes, tokens)
        $cleanExport = array_map(function($c) {
            $parts = explode(' ', trim($c['name']), 2);
            return [
                "Customer ID" => $c['customer_code'],
                "First Name" => $parts[0] ?? '',
                "Last Name" => $parts[1] ?? '',
                "Full Name" => $c['name'],
                "Email" => $c['email'],
                "Phone" => $c['phone'] ?: 'N/A',
                "Status" => $c['status'],
                "Orders" => (int)$c['order_count'],
                "Total Spent" => number_format((float)$c['total_spent'], 2, '.', ''),
                "Joined Date" => date('Y-m-d H:i:s', strtotime($c['created_at']))
            ];
        }, $customers);

        echo json_encode([
            "success" => true,
            "data" => $cleanExport,
            "count" => count($cleanExport)
        ]);
    }

    private function getCustomerOrders($id) {
        $this->requireAdmin();
        $stmt = $this->db->prepare("
            SELECT 
                o.id,
                COALESCE(o.order_number, CONCAT('ORD-', LPAD(o.id, 4, '0'))) as order_number,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            WHERE o.user_id = :id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([':id' => $id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private function getCustomerPrescriptions($id) {
        $this->requireAdmin();
        $stmt = $this->db->prepare("
            SELECT 
                p.id,
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as prescription_number,
                p.order_id,
                p.file_path,
                p.status,
                p.created_at,
                rev.name as reviewer_name
            FROM prescriptions p
            LEFT JOIN users rev ON p.reviewed_by = rev.id
            WHERE p.user_id = :id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([':id' => $id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private function getCustomerWishlist($id) {
        $this->requireAdmin();
        $stmt = $this->db->prepare("
            SELECT 
                wi.id,
                p.id as product_id,
                p.name,
                p.price,
                p.sale_price,
                p.stock_quantity,
                p.image,
                wi.created_at
            FROM wishlists w
            JOIN wishlist_items wi ON w.id = wi.wishlist_id
            JOIN products p ON wi.product_id = p.id
            WHERE w.user_id = :id
            ORDER BY wi.created_at DESC
        ");
        $stmt->execute([':id' => $id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private function getCustomerAddresses($id) {
        $this->requireAdmin();
        $stmt = $this->db->prepare("
            SELECT * FROM addresses WHERE user_id = :id ORDER BY is_default DESC, id DESC
        ");
        $stmt->execute([':id' => $id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private function getCustomerReviews($id) {
        $this->requireAdmin();
        $stmt = $this->db->prepare("
            SELECT 
                r.id,
                r.product_id,
                p.name as product_name,
                p.image as product_image,
                r.rating,
                r.title,
                r.comment,
                r.status,
                r.verified_purchase,
                r.created_at
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE r.user_id = :id AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([':id' => $id]);
        echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
