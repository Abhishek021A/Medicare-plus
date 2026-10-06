<?php
// backend/controllers/CouponController.php

require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class CouponController {
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
                if ($this->id === 'meta') {
                    $this->getMetaOptions();
                } else if ($this->id === 'summary') {
                    $this->getSummary();
                } else if ($this->id === 'export') {
                    $this->exportCoupons();
                } else if ($this->id) {
                    if ($this->subAction === 'usage') {
                        $this->getCouponUsage((int)$this->id);
                    } else {
                        $this->getCouponDetails((int)$this->id);
                    }
                } else {
                    $this->getAllCoupons();
                }
                break;

            case 'POST':
                if ($this->id === 'apply') {
                    $this->applyCoupon();
                } else if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->toggleStatus((int)$this->id);
                    } else {
                        $this->updateCoupon((int)$this->id);
                    }
                } else {
                    $this->createCoupon();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->toggleStatus((int)$this->id);
                    } else {
                        $this->updateCoupon((int)$this->id);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Coupon ID required."]);
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deleteCoupon((int)$this->id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Coupon ID required."]);
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
        // Total active (excluding soft-deleted)
        $totalStmt = $this->db->query("SELECT COUNT(*) FROM coupons WHERE deleted_at IS NULL");
        $total = (int)$totalStmt->fetchColumn();

        // Active: status is ACTIVE, started, and not expired
        $activeStmt = $this->db->query("
            SELECT COUNT(*) FROM coupons 
            WHERE deleted_at IS NULL 
              AND status = 'ACTIVE' 
              AND (start_date IS NULL OR start_date <= NOW()) 
              AND (expiry_date IS NULL OR expiry_date >= NOW())
        ");
        $active = (int)$activeStmt->fetchColumn();

        // Expired
        $expiredStmt = $this->db->query("
            SELECT COUNT(*) FROM coupons 
            WHERE deleted_at IS NULL 
              AND expiry_date IS NOT NULL 
              AND expiry_date < NOW()
        ");
        $expired = (int)$expiredStmt->fetchColumn();

        // Scheduled (future start date)
        $scheduledStmt = $this->db->query("
            SELECT COUNT(*) FROM coupons 
            WHERE deleted_at IS NULL 
              AND start_date IS NOT NULL 
              AND start_date > NOW()
        ");
        $scheduled = (int)$scheduledStmt->fetchColumn();

        // Total redemptions from coupon_usage
        $redemptionsStmt = $this->db->query("SELECT COUNT(*) FROM coupon_usage");
        $redemptions = (int)$redemptionsStmt->fetchColumn();

        // Total discount given
        $discStmt = $this->db->query("SELECT COALESCE(SUM(discount_amount), 0) FROM coupon_usage");
        $discountGiven = (float)$discStmt->fetchColumn();

        return [
            "total" => $total,
            "active" => $active,
            "expired" => $expired,
            "scheduled" => $scheduled,
            "redemptions" => $redemptions,
            "discountGiven" => $discountGiven
        ];
    }

    private function getSummary() {
        $this->requireAdmin();
        echo json_encode(["success" => true, "data" => $this->calculateSummary()]);
    }

    private function getMetaOptions() {
        $this->requireAdmin();

        $categories = $this->db->query("SELECT id, name FROM categories WHERE status = 'ACTIVE' ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $brands = $this->db->query("SELECT id, name FROM brands WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $products = $this->db->query("SELECT id, name, sku, price FROM products WHERE status = 'ACTIVE' ORDER BY name ASC LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "categories" => $categories,
                "brands" => $brands,
                "products" => $products
            ]
        ]);
    }

    private function getAllCoupons() {
        $this->requireAdmin();

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
        $discountType = strtoupper(trim($_GET['discount_type'] ?? 'ALL'));
        $sort = trim($_GET['sort'] ?? 'newest');

        $where = ["c.deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(c.code LIKE :search OR c.description LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if (!empty($discountType) && $discountType !== 'ALL') {
            $where[] = "c.discount_type = :discountType";
            $params[':discountType'] = $discountType;
        }

        // Status filtering (combining c.status with start/expiry dates)
        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'ACTIVE') {
                $where[] = "c.status = 'ACTIVE' AND (c.start_date IS NULL OR c.start_date <= NOW()) AND (c.expiry_date IS NULL OR c.expiry_date >= NOW())";
            } else if ($status === 'EXPIRED') {
                $where[] = "c.expiry_date IS NOT NULL AND c.expiry_date < NOW()";
            } else if ($status === 'SCHEDULED') {
                $where[] = "c.start_date IS NOT NULL AND c.start_date > NOW()";
            } else if ($status === 'DISABLED' || $status === 'INACTIVE') {
                $where[] = "c.status = 'INACTIVE'";
            }
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        // Sorting
        $orderBy = "ORDER BY c.created_at DESC";
        switch ($sort) {
            case 'oldest':
                $orderBy = "ORDER BY c.created_at ASC";
                break;
            case 'code_asc':
                $orderBy = "ORDER BY c.code ASC";
                break;
            case 'code_desc':
                $orderBy = "ORDER BY c.code DESC";
                break;
            case 'discount_desc':
                $orderBy = "ORDER BY c.discount_value DESC";
                break;
            case 'discount_asc':
                $orderBy = "ORDER BY c.discount_value ASC";
                break;
            case 'most_used':
                $orderBy = "ORDER BY used_count DESC";
                break;
            case 'least_used':
                $orderBy = "ORDER BY used_count ASC";
                break;
            case 'ending_soon':
                $orderBy = "ORDER BY CASE WHEN c.expiry_date IS NULL THEN 1 ELSE 0 END, c.expiry_date ASC";
                break;
            case 'newest':
            default:
                $orderBy = "ORDER BY c.created_at DESC";
                break;
        }

        $fromClause = "
            FROM coupons c
            LEFT JOIN (
                SELECT coupon_id, COUNT(*) as used_count, COALESCE(SUM(discount_amount), 0) as total_discount
                FROM coupon_usage
                GROUP BY coupon_id
            ) cu ON c.id = cu.coupon_id
        ";

        // Count total matching
        $countQuery = "SELECT COUNT(*) as total {$fromClause} {$whereClause}";
        $countStmt = $this->db->prepare($countQuery);
        foreach ($params as $k => $v) {
            $countStmt->bindValue($k, $v);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        $totalPages = ceil($total / $limit) ?: 1;

        // Fetch paginated
        $selectQuery = "
            SELECT 
                c.*,
                COALESCE(cu.used_count, 0) as used_count,
                COALESCE(cu.total_discount, 0.00) as total_discount_given,
                CASE 
                    WHEN c.status = 'INACTIVE' THEN 'DISABLED'
                    WHEN c.expiry_date IS NOT NULL AND c.expiry_date < NOW() THEN 'EXPIRED'
                    WHEN c.start_date IS NOT NULL AND c.start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as computed_status
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
        $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $summary = $this->calculateSummary();

        echo json_encode([
            "success" => true,
            "data" => [
                "coupons" => $coupons,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $totalPages
                ],
                "summary" => $summary
            ],
            // Compatibility direct properties
            "coupons" => $coupons,
            "pagination" => [
                "page" => $page,
                "limit" => $limit,
                "total" => $total,
                "totalPages" => $totalPages
            ],
            "summary" => $summary
        ]);
    }

    private function getCouponDetails($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("
            SELECT 
                c.*,
                COALESCE(cu.used_count, 0) as used_count,
                COALESCE(cu.total_discount, 0.00) as total_discount_given,
                CASE 
                    WHEN c.status = 'INACTIVE' THEN 'DISABLED'
                    WHEN c.expiry_date IS NOT NULL AND c.expiry_date < NOW() THEN 'EXPIRED'
                    WHEN c.start_date IS NOT NULL AND c.start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as computed_status
            FROM coupons c
            LEFT JOIN (
                SELECT coupon_id, COUNT(*) as used_count, COALESCE(SUM(discount_amount), 0) as total_discount
                FROM coupon_usage
                GROUP BY coupon_id
            ) cu ON c.id = cu.coupon_id
            WHERE c.id = :id AND c.deleted_at IS NULL
        ");
        $stmt->execute([':id' => $id]);
        $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coupon) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Coupon not found."]);
            return;
        }

        echo json_encode([
            "success" => true,
            "data" => $coupon,
            "coupon" => $coupon
        ]);
    }

    private function createCoupon() {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

        $code = strtoupper(trim($data['code'] ?? ''));
        $description = trim($data['description'] ?? '');
        $discountType = strtoupper(trim($data['discount_type'] ?? 'PERCENTAGE'));
        $discountValue = (float)($data['discount_value'] ?? 0);
        $minOrderAmount = (float)($data['min_order_amount'] ?? ($data['minimum_order_amount'] ?? 0));
        $maxDiscountAmount = isset($data['max_discount_amount']) && $data['max_discount_amount'] !== '' ? (float)$data['max_discount_amount'] : null;
        $startDate = !empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : null;
        $expiryDate = !empty($data['expiry_date']) ? date('Y-m-d H:i:s', strtotime($data['expiry_date'])) : (!empty($data['end_date']) ? date('Y-m-d H:i:s', strtotime($data['end_date'])) : null);
        $usageLimit = isset($data['usage_limit']) && $data['usage_limit'] !== '' ? (int)$data['usage_limit'] : null;
        $perUserLimit = isset($data['per_user_limit']) && $data['per_user_limit'] !== '' ? (int)$data['per_user_limit'] : 1;
        $firstOrderOnly = !empty($data['first_order_only']) ? 1 : 0;
        $status = strtoupper(trim($data['status'] ?? 'ACTIVE')) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

        $applicableCategories = isset($data['applicable_categories']) ? (is_array($data['applicable_categories']) ? json_encode($data['applicable_categories']) : trim($data['applicable_categories'])) : null;
        $applicableBrands = isset($data['applicable_brands']) ? (is_array($data['applicable_brands']) ? json_encode($data['applicable_brands']) : trim($data['applicable_brands'])) : null;
        $applicableProducts = isset($data['applicable_products']) ? (is_array($data['applicable_products']) ? json_encode($data['applicable_products']) : trim($data['applicable_products'])) : null;

        // Validation
        if (empty($code)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon code is required."]);
            return;
        }

        if (!preg_match('/^[A-Z0-9_\-]+$/', $code)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon code can only contain letters, numbers, hyphens, and underscores."]);
            return;
        }

        if (!in_array($discountType, ['PERCENTAGE', 'FIXED'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid discount type. Supported: PERCENTAGE, FIXED."]);
            return;
        }

        if ($discountValue <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Discount value must be greater than zero."]);
            return;
        }

        if ($discountType === 'PERCENTAGE' && $discountValue > 100) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Percentage discount cannot exceed 100%."]);
            return;
        }

        if ($startDate && $expiryDate && strtotime($expiryDate) < strtotime($startDate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Expiry date must be after start date."]);
            return;
        }

        // Code uniqueness
        $checkStmt = $this->db->prepare("SELECT id FROM coupons WHERE code = :code AND deleted_at IS NULL LIMIT 1");
        $checkStmt->execute([':code' => $code]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon code '{$code}' already exists. Please choose a different code."]);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO coupons (
                code, description, discount_type, discount_value, min_order_amount, max_discount_amount,
                start_date, expiry_date, usage_limit, per_user_limit, first_order_only,
                applicable_categories, applicable_brands, applicable_products, status, created_at, updated_at
            ) VALUES (
                :code, :description, :discount_type, :discount_value, :min_order_amount, :max_discount_amount,
                :start_date, :expiry_date, :usage_limit, :per_user_limit, :first_order_only,
                :applicable_categories, :applicable_brands, :applicable_products, :status, NOW(), NOW()
            )
        ");

        $stmt->execute([
            ':code' => $code,
            ':description' => $description,
            ':discount_type' => $discountType,
            ':discount_value' => $discountValue,
            ':min_order_amount' => $minOrderAmount,
            ':max_discount_amount' => $maxDiscountAmount,
            ':start_date' => $startDate,
            ':expiry_date' => $expiryDate,
            ':usage_limit' => $usageLimit,
            ':per_user_limit' => $perUserLimit,
            ':first_order_only' => $firstOrderOnly,
            ':applicable_categories' => $applicableCategories,
            ':applicable_brands' => $applicableBrands,
            ':applicable_products' => $applicableProducts,
            ':status' => $status
        ]);

        $newId = (int)$this->db->lastInsertId();

        $fetchStmt = $this->db->prepare("SELECT * FROM coupons WHERE id = :id");
        $fetchStmt->execute([':id' => $newId]);
        $newCoupon = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "message" => "Coupon '{$code}' created successfully.",
            "data" => $newCoupon,
            "coupon" => $newCoupon,
            "summary" => $this->calculateSummary()
        ]);
    }

    private function updateCoupon($id) {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

        $checkStmt = $this->db->prepare("SELECT * FROM coupons WHERE id = :id AND deleted_at IS NULL");
        $checkStmt->execute([':id' => $id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Coupon not found."]);
            return;
        }

        $code = strtoupper(trim($data['code'] ?? $existing['code']));
        $description = trim($data['description'] ?? ($existing['description'] ?? ''));
        $discountType = strtoupper(trim($data['discount_type'] ?? $existing['discount_type']));
        $discountValue = isset($data['discount_value']) ? (float)$data['discount_value'] : (float)$existing['discount_value'];
        $minOrderAmount = isset($data['min_order_amount']) ? (float)$data['min_order_amount'] : (float)$existing['min_order_amount'];
        $maxDiscountAmount = array_key_exists('max_discount_amount', $data) ? ($data['max_discount_amount'] !== '' ? (float)$data['max_discount_amount'] : null) : $existing['max_discount_amount'];
        $startDate = !empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : (array_key_exists('start_date', $data) && empty($data['start_date']) ? null : $existing['start_date']);
        $expiryDate = !empty($data['expiry_date']) ? date('Y-m-d H:i:s', strtotime($data['expiry_date'])) : (!empty($data['end_date']) ? date('Y-m-d H:i:s', strtotime($data['end_date'])) : (array_key_exists('expiry_date', $data) && empty($data['expiry_date']) ? null : $existing['expiry_date']));
        $usageLimit = array_key_exists('usage_limit', $data) ? ($data['usage_limit'] !== '' ? (int)$data['usage_limit'] : null) : $existing['usage_limit'];
        $perUserLimit = array_key_exists('per_user_limit', $data) ? (int)$data['per_user_limit'] : (int)$existing['per_user_limit'];
        $firstOrderOnly = array_key_exists('first_order_only', $data) ? (!empty($data['first_order_only']) ? 1 : 0) : (int)$existing['first_order_only'];
        $status = strtoupper(trim($data['status'] ?? $existing['status'])) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

        $applicableCategories = array_key_exists('applicable_categories', $data) ? (is_array($data['applicable_categories']) ? json_encode($data['applicable_categories']) : trim($data['applicable_categories'])) : $existing['applicable_categories'];
        $applicableBrands = array_key_exists('applicable_brands', $data) ? (is_array($data['applicable_brands']) ? json_encode($data['applicable_brands']) : trim($data['applicable_brands'])) : $existing['applicable_brands'];
        $applicableProducts = array_key_exists('applicable_products', $data) ? (is_array($data['applicable_products']) ? json_encode($data['applicable_products']) : trim($data['applicable_products'])) : $existing['applicable_products'];

        // Validation
        if (empty($code)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon code cannot be empty."]);
            return;
        }

        if ($discountValue <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Discount value must be greater than zero."]);
            return;
        }

        if ($discountType === 'PERCENTAGE' && $discountValue > 100) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Percentage discount cannot exceed 100%."]);
            return;
        }

        if ($startDate && $expiryDate && strtotime($expiryDate) < strtotime($startDate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Expiry date must be after start date."]);
            return;
        }

        // Uniqueness check against other coupons
        $uniqueStmt = $this->db->prepare("SELECT id FROM coupons WHERE code = :code AND id != :id AND deleted_at IS NULL LIMIT 1");
        $uniqueStmt->execute([':code' => $code, ':id' => $id]);
        if ($uniqueStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon code '{$code}' is already used by another coupon."]);
            return;
        }

        $stmt = $this->db->prepare("
            UPDATE coupons SET
                code = :code,
                description = :description,
                discount_type = :discount_type,
                discount_value = :discount_value,
                min_order_amount = :min_order_amount,
                max_discount_amount = :max_discount_amount,
                start_date = :start_date,
                expiry_date = :expiry_date,
                usage_limit = :usage_limit,
                per_user_limit = :per_user_limit,
                first_order_only = :first_order_only,
                applicable_categories = :applicable_categories,
                applicable_brands = :applicable_brands,
                applicable_products = :applicable_products,
                status = :status,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':code' => $code,
            ':description' => $description,
            ':discount_type' => $discountType,
            ':discount_value' => $discountValue,
            ':min_order_amount' => $minOrderAmount,
            ':max_discount_amount' => $maxDiscountAmount,
            ':start_date' => $startDate,
            ':expiry_date' => $expiryDate,
            ':usage_limit' => $usageLimit,
            ':per_user_limit' => $perUserLimit,
            ':first_order_only' => $firstOrderOnly,
            ':applicable_categories' => $applicableCategories,
            ':applicable_brands' => $applicableBrands,
            ':applicable_products' => $applicableProducts,
            ':status' => $status,
            ':id' => $id
        ]);

        $fetchStmt = $this->db->prepare("SELECT * FROM coupons WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $updated = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "message" => "Coupon '{$code}' updated successfully.",
            "data" => $updated,
            "coupon" => $updated,
            "summary" => $this->calculateSummary()
        ]);
    }

    private function toggleStatus($id) {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $status = strtoupper(trim($data['status'] ?? ''));

        $stmt = $this->db->prepare("SELECT * FROM coupons WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coupon) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Coupon not found."]);
            return;
        }

        if (empty($status)) {
            $status = $coupon['status'] === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        }

        // If attempting to enable an expired coupon, reject with informative error
        if ($status === 'ACTIVE' && !empty($coupon['expiry_date']) && strtotime($coupon['expiry_date']) < time()) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "This coupon has expired. Please update the validity dates before enabling it."
            ]);
            return;
        }

        $updStmt = $this->db->prepare("UPDATE coupons SET status = :status, updated_at = NOW() WHERE id = :id");
        $updStmt->execute([':status' => $status, ':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Coupon " . ($status === 'ACTIVE' ? "enabled" : "disabled") . " successfully.",
            "status" => $status,
            "summary" => $this->calculateSummary()
        ]);
    }

    private function deleteCoupon($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM coupons WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coupon) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Coupon not found."]);
            return;
        }

        // Soft delete/archive
        $delStmt = $this->db->prepare("UPDATE coupons SET deleted_at = NOW(), status = 'INACTIVE' WHERE id = :id");
        $delStmt->execute([':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Coupon '{$coupon['code']}' archived successfully.",
            "summary" => $this->calculateSummary()
        ]);
    }

    private function getCouponUsage($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("
            SELECT 
                cu.id,
                cu.coupon_id,
                cu.user_id,
                cu.order_id,
                cu.discount_amount,
                cu.created_at,
                u.name as customer_name,
                u.email as customer_email,
                o.order_number,
                o.total_amount as order_total,
                o.order_status
            FROM coupon_usage cu
            LEFT JOIN users u ON cu.user_id = u.id
            LEFT JOIN orders o ON cu.order_id = o.id
            WHERE cu.coupon_id = :id
            ORDER BY cu.created_at DESC
        ");
        $stmt->execute([':id' => $id]);
        $usages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "data" => $usages]);
    }

    private function exportCoupons() {
        $this->requireAdmin();

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));

        $where = ["c.deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(c.code LIKE :search OR c.description LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'ACTIVE') {
                $where[] = "c.status = 'ACTIVE' AND (c.start_date IS NULL OR c.start_date <= NOW()) AND (c.expiry_date IS NULL OR c.expiry_date >= NOW())";
            } else if ($status === 'EXPIRED') {
                $where[] = "c.expiry_date IS NOT NULL AND c.expiry_date < NOW()";
            } else if ($status === 'SCHEDULED') {
                $where[] = "c.start_date IS NOT NULL AND c.start_date > NOW()";
            } else if ($status === 'DISABLED' || $status === 'INACTIVE') {
                $where[] = "c.status = 'INACTIVE'";
            }
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $query = "
            SELECT 
                c.code,
                c.description,
                c.discount_type,
                c.discount_value,
                c.min_order_amount,
                c.max_discount_amount,
                c.start_date,
                c.expiry_date,
                c.usage_limit,
                COALESCE(cu.used_count, 0) as used_count,
                CASE 
                    WHEN c.status = 'INACTIVE' THEN 'DISABLED'
                    WHEN c.expiry_date IS NOT NULL AND c.expiry_date < NOW() THEN 'EXPIRED'
                    WHEN c.start_date IS NOT NULL AND c.start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as status
            FROM coupons c
            LEFT JOIN (
                SELECT coupon_id, COUNT(*) as used_count
                FROM coupon_usage
                GROUP BY coupon_id
            ) cu ON c.id = cu.coupon_id
            {$whereClause}
            ORDER BY c.created_at DESC
        ";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cleanExport = array_map(function($c) {
            return [
                "Coupon Code" => $c['code'],
                "Description" => $c['description'] ?: 'N/A',
                "Discount Type" => $c['discount_type'],
                "Discount Value" => $c['discount_type'] === 'PERCENTAGE' ? $c['discount_value'] . '%' : '₹' . $c['discount_value'],
                "Minimum Order" => '₹' . number_format((float)$c['min_order_amount'], 2),
                "Maximum Discount" => $c['max_discount_amount'] ? '₹' . number_format((float)$c['max_discount_amount'], 2) : 'None',
                "Start Date" => $c['start_date'] ? date('Y-m-d', strtotime($c['start_date'])) : 'Immediate',
                "End Date" => $c['expiry_date'] ? date('Y-m-d', strtotime($c['expiry_date'])) : 'No Expiry',
                "Usage Limit" => $c['usage_limit'] ?: 'Unlimited',
                "Used Count" => (int)$c['used_count'],
                "Status" => $c['status']
            ];
        }, $coupons);

        echo json_encode(["success" => true, "data" => $cleanExport, "count" => count($cleanExport)]);
    }

    /**
     * Customer Cart & Checkout Validation Endpoint: POST /coupons/apply
     */
    public function applyCoupon() {
        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $code = strtoupper(trim($data['code'] ?? ''));

        if (empty($code)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Please enter a coupon code."]);
            return;
        }

        // Get authenticated user if present
        $userId = AuthMiddleware::getAuthenticatedUserId($this->db);

        // Fetch coupon
        $stmt = $this->db->prepare("SELECT * FROM coupons WHERE code = :code AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([':code' => $code]);
        $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coupon) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Invalid coupon code."]);
            return;
        }

        // 1. Status Check
        if ($coupon['status'] !== 'ACTIVE') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "This coupon is currently disabled or inactive."]);
            return;
        }

        // 2. Start Date Check
        if (!empty($coupon['start_date']) && strtotime($coupon['start_date']) > time()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon is not active yet. Starts on " . date('d M Y', strtotime($coupon['start_date'])) . "."]);
            return;
        }

        // 3. Expiry Date Check
        if (!empty($coupon['expiry_date']) && strtotime($coupon['expiry_date']) < time()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon has expired."]);
            return;
        }

        // 4. Overall Usage Limit Check
        if (!empty($coupon['usage_limit'])) {
            $usageCountStmt = $this->db->prepare("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = :id");
            $usageCountStmt->execute([':id' => $coupon['id']]);
            $usedCount = (int)$usageCountStmt->fetchColumn();

            if ($usedCount >= (int)$coupon['usage_limit']) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Coupon usage limit reached."]);
                return;
            }
        }

        // 5. Per User Limit Check
        if ($userId && !empty($coupon['per_user_limit'])) {
            $userUsageStmt = $this->db->prepare("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = :id AND user_id = :user_id");
            $userUsageStmt->execute([':id' => $coupon['id'], ':user_id' => $userId]);
            $userUsedCount = (int)$userUsageStmt->fetchColumn();

            if ($userUsedCount >= (int)$coupon['per_user_limit']) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "You have already used this coupon."]);
                return;
            }
        }

        // 6. First Order Only Check
        if ($userId && !empty($coupon['first_order_only'])) {
            $ordersCountStmt = $this->db->prepare("SELECT COUNT(*) FROM orders WHERE user_id = :user_id AND order_status != 'CANCELLED'");
            $ordersCountStmt->execute([':user_id' => $userId]);
            $prevOrders = (int)$ordersCountStmt->fetchColumn();

            if ($prevOrders > 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Coupon is valid for first orders only."]);
                return;
            }
        }

        // 7. Cart Items & Subtotal Calculation
        $cartItems = $data['cart_items'] ?? ($data['items'] ?? []);
        $rawSubtotal = (float)($data['subtotal'] ?? 0);

        // Fetch actual product details from DB for provided cart items
        $eligibleSubtotal = 0.00;
        $totalCartSubtotal = 0.00;

        $catRestrictions = !empty($coupon['applicable_categories']) ? json_decode($coupon['applicable_categories'], true) : [];
        if (!is_array($catRestrictions) && !empty($coupon['applicable_categories'])) {
            $catRestrictions = array_map('intval', explode(',', $coupon['applicable_categories']));
        }

        $brandRestrictions = !empty($coupon['applicable_brands']) ? json_decode($coupon['applicable_brands'], true) : [];
        if (!is_array($brandRestrictions) && !empty($coupon['applicable_brands'])) {
            $brandRestrictions = array_map('intval', explode(',', $coupon['applicable_brands']));
        }

        $productRestrictions = !empty($coupon['applicable_products']) ? json_decode($coupon['applicable_products'], true) : [];
        if (!is_array($productRestrictions) && !empty($coupon['applicable_products'])) {
            $productRestrictions = array_map('intval', explode(',', $coupon['applicable_products']));
        }

        if (!empty($cartItems) && is_array($cartItems)) {
            $productIds = [];
            foreach ($cartItems as $it) {
                $pid = (int)($it['productId'] ?? ($it['id'] ?? 0));
                if ($pid > 0) $productIds[] = $pid;
            }

            if (!empty($productIds)) {
                $inQuery = implode(',', array_fill(0, count($productIds), '?'));
                $pStmt = $this->db->prepare("SELECT id, name, category_id, brand_id, price, sale_price FROM products WHERE id IN ({$inQuery})");
                $pStmt->execute($productIds);
                $dbProducts = [];
                while ($pRow = $pStmt->fetch(PDO::FETCH_ASSOC)) {
                    $dbProducts[$pRow['id']] = $pRow;
                }

                foreach ($cartItems as $item) {
                    $pid = (int)($item['productId'] ?? ($item['id'] ?? 0));
                    $qty = max(1, (int)($item['quantity'] ?? 1));
                    $unitPrice = isset($dbProducts[$pid]) ? (float)($dbProducts[$pid]['sale_price'] ?: $dbProducts[$pid]['price']) : (float)($item['price'] ?? 0);
                    $lineTotal = $unitPrice * $qty;
                    $totalCartSubtotal += $lineTotal;

                    // Check eligibility
                    $isEligible = true;
                    if (!empty($productRestrictions) && !in_array($pid, $productRestrictions)) {
                        $isEligible = false;
                    }
                    if ($isEligible && !empty($catRestrictions) && isset($dbProducts[$pid]['category_id'])) {
                        if (!in_array((int)$dbProducts[$pid]['category_id'], $catRestrictions)) {
                            $isEligible = false;
                        }
                    }
                    if ($isEligible && !empty($brandRestrictions) && isset($dbProducts[$pid]['brand_id'])) {
                        if (!in_array((int)$dbProducts[$pid]['brand_id'], $brandRestrictions)) {
                            $isEligible = false;
                        }
                    }

                    if ($isEligible) {
                        $eligibleSubtotal += $lineTotal;
                    }
                }
            }
        }

        // If no cart items provided, fallback to rawSubtotal
        if ($totalCartSubtotal <= 0 && $rawSubtotal > 0) {
            $totalCartSubtotal = $rawSubtotal;
            $eligibleSubtotal = $rawSubtotal;
        }

        // 8. Eligibility Check
        if ($eligibleSubtotal <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Coupon is not applicable to any items in your cart."]);
            return;
        }

        // 9. Minimum Order Check
        $minOrder = (float)$coupon['min_order_amount'];
        if ($totalCartSubtotal < $minOrder) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Minimum order value is ₹" . number_format($minOrder, 2) . ". Current order: ₹" . number_format($totalCartSubtotal, 2) . "."
            ]);
            return;
        }

        // 10. Discount Calculation
        $discountAmount = 0.00;
        if ($coupon['discount_type'] === 'PERCENTAGE') {
            $pct = (float)$coupon['discount_value'];
            $discountAmount = ($eligibleSubtotal * $pct) / 100;
            if (!empty($coupon['max_discount_amount'])) {
                $maxDisc = (float)$coupon['max_discount_amount'];
                if ($discountAmount > $maxDisc) {
                    $discountAmount = $maxDisc;
                }
            }
        } else {
            // FIXED
            $fixedVal = (float)$coupon['discount_value'];
            $discountAmount = min($eligibleSubtotal, $fixedVal);
        }

        $discountAmount = round($discountAmount, 2);

        echo json_encode([
            "success" => true,
            "message" => "Coupon '{$coupon['code']}' applied successfully!",
            "data" => [
                "coupon_id" => (int)$coupon['id'],
                "code" => $coupon['code'],
                "description" => $coupon['description'],
                "discount_type" => $coupon['discount_type'],
                "discount_value" => (float)$coupon['discount_value'],
                "discount_amount" => $discountAmount,
                "subtotal" => $totalCartSubtotal,
                "eligible_subtotal" => $eligibleSubtotal,
                "min_order_amount" => $minOrder,
                "max_discount_amount" => $coupon['max_discount_amount'] ? (float)$coupon['max_discount_amount'] : null
            ]
        ]);
    }
}
