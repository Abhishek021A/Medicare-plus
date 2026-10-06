<?php
// backend/controllers/InventoryController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class InventoryController {
    private $method;
    private $action;
    private $id;
    private $db;
    private $currentAdmin = null;
    private $adminId = 1;

    public function __construct($method, $action = null, $id = null) {
        $this->method = $method;
        $this->action = $action;
        $this->id = $id;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function processRequest() {
        // Authenticate admin securely
        if (!$this->authenticateAdmin()) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Administrator access required."]);
            return;
        }

        if ($this->method === 'POST' && isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
            $this->method = 'PUT';
        }

        if ($this->method === 'GET') {
            if ($this->action === 'summary') {
                $this->getSummary();
            } else if ($this->action === 'export') {
                $this->exportInventory();
            } else if ($this->action === 'history') {
                $productId = $this->id ?? ($_GET['product_id'] ?? null);
                $this->getHistory($productId);
            } else if (is_numeric($this->action)) {
                if ($this->id === 'history') {
                    $this->getHistory((int)$this->action);
                } else {
                    $this->getInventoryItem((int)$this->action);
                }
            } else {
                $this->getInventory();
            }
        } else if ($this->method === 'POST') {
            if ($this->action === 'adjust') {
                $this->adjustStock();
            } else if ($this->action === 'bulk-adjust') {
                $this->bulkAdjustStock();
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Endpoint not found"]);
            }
        } else {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Method not allowed"]);
        }
    }

    private function authenticateAdmin() {
        $token = AuthMiddleware::getBearerToken();
        
        if (!$token) {
            // Also check query param or headers fallback
            $headers = function_exists('getallheaders') ? getallheaders() : [];
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
            if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            return false;
        }

        // Handle standard development token by looking up active admin in database
        if ($token === 'mock-admin-token-123') {
            $stmt = $this->db->prepare("SELECT id, name, email, role FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER') AND status = 'ACTIVE' ORDER BY id ASC LIMIT 1");
            $stmt->execute();
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                $this->currentAdmin = $admin;
                $this->adminId = (int)$admin['id'];
                return true;
            }
            // Fallback to first user if roles not set
            $stmt = $this->db->query("SELECT id, name, email, role FROM users LIMIT 1");
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                $this->currentAdmin = $admin;
                $this->adminId = (int)$admin['id'];
                return true;
            }
            $this->adminId = 1;
            return true;
        }

        // Verify signed token / authenticated user
        $user = AuthMiddleware::getAuthenticatedUser($this->db);
        if ($user && in_array($user['role'], ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            $this->currentAdmin = $user;
            $this->adminId = (int)$user['id'];
            return true;
        }

        return false;
    }

    private function getInventory() {
        $search = trim($_GET['search'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $sort = trim($_GET['sort'] ?? 'updated_desc');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limitParam = $_GET['limit'] ?? '10';
        $isAll = strtolower($limitParam) === 'all';
        $limit = $isAll ? 1000 : max(1, (int)$limitParam);
        $offset = ($page - 1) * $limit;

        $whereClauses = [];
        $params = [];

        // 1. Search filter: product name, SKU, brand name, category name
        if ($search !== '') {
            $whereClauses[] = "(p.name LIKE :search1 OR p.sku LIKE :search2 OR b.name LIKE :search3 OR c.name LIKE :search4)";
            $searchTerm = "%{$search}%";
            $params[':search1'] = $searchTerm;
            $params[':search2'] = $searchTerm;
            $params[':search3'] = $searchTerm;
            $params[':search4'] = $searchTerm;
        }

        // 2. Category filter
        if ($category !== '' && strtolower($category) !== 'all') {
            if (is_numeric($category)) {
                $whereClauses[] = "p.category_id = :category_id";
                $params[':category_id'] = (int)$category;
            } else {
                $whereClauses[] = "c.name = :category_name";
                $params[':category_name'] = $category;
            }
        }

        // 3. Stock Status filter
        if ($status !== '' && strtolower($status) !== 'all') {
            $normalizedStatus = strtoupper($status);
            if ($normalizedStatus === 'OUT OF STOCK') {
                $whereClauses[] = "p.stock_quantity <= 0";
            } else if ($normalizedStatus === 'LOW STOCK') {
                $whereClauses[] = "(p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold)";
            } else if ($normalizedStatus === 'IN STOCK') {
                $whereClauses[] = "p.stock_quantity > p.low_stock_threshold";
            }
        }

        $whereSql = !empty($whereClauses) ? ' WHERE ' . implode(' AND ', $whereClauses) : '';

        // 4. Sorting logic
        $sortMapping = [
            'updated_desc' => 'p.updated_at DESC',
            'updated_asc' => 'p.updated_at ASC',
            'name_asc' => 'p.name ASC',
            'name_desc' => 'p.name DESC',
            'stock_asc' => 'p.stock_quantity ASC',
            'stock_desc' => 'p.stock_quantity DESC',
            'price_asc' => 'COALESCE(NULLIF(p.sale_price, 0), p.price) ASC',
            'price_desc' => 'COALESCE(NULLIF(p.sale_price, 0), p.price) DESC',
            'value_asc' => '(p.stock_quantity * COALESCE(NULLIF(p.sale_price, 0), p.price)) ASC',
            'value_desc' => '(p.stock_quantity * COALESCE(NULLIF(p.sale_price, 0), p.price)) DESC'
        ];
        $orderBySql = $sortMapping[$sort] ?? 'p.updated_at DESC';

        try {
            // Count total filtered records
            $countQuery = "
                SELECT COUNT(p.id) as total_count 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                {$whereSql}
            ";
            $countStmt = $this->db->prepare($countQuery);
            foreach ($params as $key => $val) {
                $countStmt->bindValue($key, $val);
            }
            $countStmt->execute();
            $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total_count'];

            // Fetch filtered & paginated records
            $query = "
                SELECT 
                    p.id, 
                    p.name, 
                    p.sku, 
                    p.stock_quantity, 
                    p.low_stock_threshold, 
                    p.price, 
                    p.sale_price,
                    p.image,
                    p.status,
                    p.updated_at,
                    c.name as category_name,
                    b.name as brand_name,
                    ROUND(p.stock_quantity * COALESCE(NULLIF(p.sale_price, 0), p.price), 2) as inventory_value,
                    CASE 
                        WHEN p.stock_quantity <= 0 THEN 'OUT OF STOCK'
                        WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW STOCK'
                        ELSE 'IN STOCK'
                    END as stock_status
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN brands b ON p.brand_id = b.id
                {$whereSql}
                ORDER BY {$orderBySql}
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->db->prepare($query);
            foreach ($params as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch summary stats across ALL products (for the top cards)
            $summary = $this->calculateSummary();

            $totalPages = $limit > 0 ? (int)ceil($totalCount / $limit) : 1;

            echo json_encode([
                "success" => true,
                "data" => [
                    "items" => $products,
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
            echo json_encode(["success" => false, "message" => "Failed to load inventory: " . $e->getMessage()]);
        }
    }

    private function calculateSummary() {
        $summaryQuery = "
            SELECT 
                COUNT(id) as total_products,
                COALESCE(SUM(stock_quantity), 0) as total_stock,
                COALESCE(SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock,
                COALESCE(SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END), 0) as low_stock,
                COALESCE(ROUND(SUM(stock_quantity * COALESCE(NULLIF(sale_price, 0), price)), 2), 0.00) as inventory_value
            FROM products
        ";
        $stmt = $this->db->query($summaryQuery);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            "total_products" => (int)($summary['total_products'] ?? 0),
            "total_stock" => (int)($summary['total_stock'] ?? 0),
            "out_of_stock" => (int)($summary['out_of_stock'] ?? 0),
            "low_stock" => (int)($summary['low_stock'] ?? 0),
            "inventory_value" => (float)($summary['inventory_value'] ?? 0.00),
            // CamelCase aliases
            "totalProducts" => (int)($summary['total_products'] ?? 0),
            "totalStockUnits" => (int)($summary['total_stock'] ?? 0),
            "outOfStock" => (int)($summary['out_of_stock'] ?? 0),
            "lowStock" => (int)($summary['low_stock'] ?? 0),
            "inventoryValue" => (float)($summary['inventory_value'] ?? 0.00)
        ];
    }

    private function getSummary() {
        try {
            $summary = $this->calculateSummary();
            echo json_encode(["success" => true, "data" => $summary]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to load summary."]);
        }
    }

    private function getInventoryItem($id) {
        $query = "
            SELECT 
                p.id, 
                p.name, 
                p.sku, 
                p.stock_quantity, 
                p.low_stock_threshold, 
                p.price, 
                p.sale_price,
                p.image,
                p.status,
                p.updated_at,
                c.name as category_name,
                b.name as brand_name,
                ROUND(p.stock_quantity * COALESCE(NULLIF(p.sale_price, 0), p.price), 2) as inventory_value,
                CASE 
                    WHEN p.stock_quantity <= 0 THEN 'OUT OF STOCK'
                    WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW STOCK'
                    ELSE 'IN STOCK'
                END as stock_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.id = :id
            LIMIT 1
        ";
        try {
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Product not found."]);
                return;
            }

            echo json_encode(["success" => true, "data" => $product]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function getHistory($productId = null) {
        $type = trim($_GET['type'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        if (!empty($productId)) {
            $where[] = "it.product_id = :product_id";
            $params[':product_id'] = (int)$productId;
        }

        if (!empty($type) && strtolower($type) !== 'all') {
            $where[] = "it.type = :type";
            $params[':type'] = $type;
        }

        if (!empty($search)) {
            $where[] = "(p.name LIKE :search1 OR p.sku LIKE :search2 OR it.reason LIKE :search3 OR it.notes LIKE :search4)";
            $term = "%{$search}%";
            $params[':search1'] = $term;
            $params[':search2'] = $term;
            $params[':search3'] = $term;
            $params[':search4'] = $term;
        }

        $whereSql = !empty($where) ? ' WHERE ' . implode(' AND ', $where) : '';

        try {
            $countQuery = "
                SELECT COUNT(it.id) as total_count 
                FROM inventory_transactions it
                LEFT JOIN products p ON it.product_id = p.id
                {$whereSql}
            ";
            $countStmt = $this->db->prepare($countQuery);
            foreach ($params as $k => $v) {
                $countStmt->bindValue($k, $v);
            }
            $countStmt->execute();
            $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total_count'];

            $query = "
                SELECT 
                    it.id,
                    it.product_id,
                    it.type,
                    it.quantity,
                    it.previous_stock,
                    it.new_stock,
                    it.reason,
                    it.notes,
                    it.admin_id,
                    it.created_at,
                    p.name as product_name,
                    p.sku as product_sku,
                    p.image as product_image,
                    u.name as admin_name,
                    u.email as admin_email
                FROM inventory_transactions it 
                LEFT JOIN products p ON it.product_id = p.id
                LEFT JOIN users u ON it.admin_id = u.id
                {$whereSql}
                ORDER BY it.created_at DESC
                LIMIT :limit OFFSET :offset
            ";
            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true, 
                "data" => $history,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $totalCount,
                    "totalPages" => (int)ceil($totalCount / $limit)
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to load history: " . $e->getMessage()]);
        }
    }

    private function normalizeAdjustmentType($type) {
        $t = strtolower(trim($type));
        if ($t === 'add' || $t === 'add stock') return 'Add Stock';
        if ($t === 'remove' || $t === 'remove stock') return 'Remove Stock';
        if ($t === 'set' || $t === 'set stock') return 'Set Stock';
        return 'Add Stock';
    }

    private function adjustStock() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST;

        $productId = isset($data['product_id']) ? (int)$data['product_id'] : null;
        $rawType = $data['type'] ?? 'Add Stock';
        $type = $this->normalizeAdjustmentType($rawType);
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : null;
        $reason = trim($data['reason'] ?? 'Manual Stock Adjustment');
        $notes = trim($data['notes'] ?? '');

        if (!$productId || $quantity === null || $quantity < 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid adjustment data. Quantity must be 0 or greater."]);
            return;
        }

        try {
            $this->db->beginTransaction();

            // Lock product row for atomic update
            $stmt = $this->db->prepare("SELECT id, name, stock_quantity, low_stock_threshold, price, sale_price FROM products WHERE id = :id FOR UPDATE");
            $stmt->bindParam(':id', $productId, PDO::PARAM_INT);
            $stmt->execute();
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Product not found."]);
                return;
            }

            $currentStock = (int)$product['stock_quantity'];

            // Calculate new stock and validate
            if ($type === 'Add Stock') {
                $newStock = $currentStock + $quantity;
            } else if ($type === 'Remove Stock') {
                if ($quantity > $currentStock) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode([
                        "success" => false, 
                        "message" => "Cannot remove {$quantity} units. Only {$currentStock} units are currently available."
                    ]);
                    return;
                }
                $newStock = max(0, $currentStock - $quantity);
            } else if ($type === 'Set Stock') {
                $newStock = $quantity;
            } else {
                $this->db->rollBack();
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Invalid adjustment type."]);
                return;
            }

            // Update products table
            $updateStmt = $this->db->prepare("UPDATE products SET stock_quantity = :new_stock, updated_at = NOW() WHERE id = :id");
            $updateStmt->bindParam(':new_stock', $newStock, PDO::PARAM_INT);
            $updateStmt->bindParam(':id', $productId, PDO::PARAM_INT);
            $updateStmt->execute();

            // Record transaction
            $actualDiff = abs($newStock - $currentStock);
            $insertStmt = $this->db->prepare("
                INSERT INTO inventory_transactions 
                (product_id, type, quantity, previous_stock, new_stock, reason, notes, admin_id) 
                VALUES (:product_id, :type, :quantity, :prev, :new, :reason, :notes, :admin_id)
            ");
            $insertStmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
            $insertStmt->bindParam(':type', $type);
            $insertStmt->bindParam(':quantity', $actualDiff, PDO::PARAM_INT);
            $insertStmt->bindParam(':prev', $currentStock, PDO::PARAM_INT);
            $insertStmt->bindParam(':new', $newStock, PDO::PARAM_INT);
            $insertStmt->bindParam(':reason', $reason);
            $insertStmt->bindParam(':notes', $notes);
            $insertStmt->bindParam(':admin_id', $this->adminId, PDO::PARAM_INT);
            $insertStmt->execute();

            $this->db->commit();

            try {
                $threshold = (int)$product['low_stock_threshold'];
                if ($newStock <= 0) {
                    require_once __DIR__ . '/../services/NotificationService.php';
                    (new NotificationService($this->db))->notifyOutOfStock($productId, $product['name'], $product['sku'] ?? '');
                } elseif ($currentStock > $threshold && $newStock <= $threshold) {
                    require_once __DIR__ . '/../services/NotificationService.php';
                    (new NotificationService($this->db))->notifyLowStock($productId, $product['name'], $newStock, $threshold, $product['sku'] ?? '');
                }
            } catch (Exception $notifEx) {
                error_log("Failed to trigger stock notification: " . $notifEx->getMessage());
            }

            // Fetch updated summary
            $summary = $this->calculateSummary();

            echo json_encode([
                "success" => true, 
                "message" => "Stock for {$product['name']} updated successfully.",
                "product_id" => $productId,
                "previous_stock" => $currentStock,
                "new_stock" => $newStock,
                "summary" => $summary
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    private function bulkAdjustStock() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST;

        $productIds = $data['product_ids'] ?? ($data['items'] ?? []);
        $rawType = $data['type'] ?? 'Add Stock';
        $type = $this->normalizeAdjustmentType($rawType);
        $quantity = isset($data['quantity']) ? (int)$data['quantity'] : null;
        $reason = trim($data['reason'] ?? 'Bulk Stock Adjustment');
        $notes = trim($data['notes'] ?? '');

        if (empty($productIds) || !is_array($productIds) || $quantity === null || $quantity < 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid bulk adjustment data. Select products and enter a valid quantity."]);
            return;
        }

        try {
            $this->db->beginTransaction();

            $updatedCount = 0;
            $errors = [];

            foreach ($productIds as $pId) {
                $productId = (int)$pId;
                if ($productId <= 0) continue;

                $stmt = $this->db->prepare("SELECT id, name, stock_quantity FROM products WHERE id = :id FOR UPDATE");
                $stmt->bindParam(':id', $productId, PDO::PARAM_INT);
                $stmt->execute();
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    continue;
                }

                $currentStock = (int)$product['stock_quantity'];

                if ($type === 'Add Stock') {
                    $newStock = $currentStock + $quantity;
                } else if ($type === 'Remove Stock') {
                    if ($quantity > $currentStock) {
                        $errors[] = "Cannot remove {$quantity} from {$product['name']} (only {$currentStock} available).";
                        continue;
                    }
                    $newStock = max(0, $currentStock - $quantity);
                } else if ($type === 'Set Stock') {
                    $newStock = $quantity;
                } else {
                    $newStock = $currentStock;
                }

                $updateStmt = $this->db->prepare("UPDATE products SET stock_quantity = :new_stock, updated_at = NOW() WHERE id = :id");
                $updateStmt->bindParam(':new_stock', $newStock, PDO::PARAM_INT);
                $updateStmt->bindParam(':id', $productId, PDO::PARAM_INT);
                $updateStmt->execute();

                $actualDiff = abs($newStock - $currentStock);
                $insertStmt = $this->db->prepare("
                    INSERT INTO inventory_transactions 
                    (product_id, type, quantity, previous_stock, new_stock, reason, notes, admin_id) 
                    VALUES (:product_id, :type, :quantity, :prev, :new, :reason, :notes, :admin_id)
                ");
                $insertStmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
                $insertStmt->bindParam(':type', $type);
                $insertStmt->bindParam(':quantity', $actualDiff, PDO::PARAM_INT);
                $insertStmt->bindParam(':prev', $currentStock, PDO::PARAM_INT);
                $insertStmt->bindParam(':new', $newStock, PDO::PARAM_INT);
                $insertStmt->bindParam(':reason', $reason);
                $insertStmt->bindParam(':notes', $notes);
                $insertStmt->bindParam(':admin_id', $this->adminId, PDO::PARAM_INT);
                $insertStmt->execute();

                $updatedCount++;
            }

            $this->db->commit();

            $summary = $this->calculateSummary();

            echo json_encode([
                "success" => true,
                "message" => "Successfully updated stock for {$updatedCount} product(s)." . (!empty($errors) ? " Notice: " . implode(" ", $errors) : ""),
                "updated_count" => $updatedCount,
                "summary" => $summary
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error during bulk update: " . $e->getMessage()]);
        }
    }

    private function exportInventory() {
        $search = trim($_GET['search'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $sort = trim($_GET['sort'] ?? 'name_asc');

        $whereClauses = [];
        $params = [];

        if ($search !== '') {
            $whereClauses[] = "(p.name LIKE :search1 OR p.sku LIKE :search2 OR b.name LIKE :search3 OR c.name LIKE :search4)";
            $searchTerm = "%{$search}%";
            $params[':search1'] = $searchTerm;
            $params[':search2'] = $searchTerm;
            $params[':search3'] = $searchTerm;
            $params[':search4'] = $searchTerm;
        }

        if ($category !== '' && strtolower($category) !== 'all') {
            if (is_numeric($category)) {
                $whereClauses[] = "p.category_id = :category_id";
                $params[':category_id'] = (int)$category;
            } else {
                $whereClauses[] = "c.name = :category_name";
                $params[':category_name'] = $category;
            }
        }

        if ($status !== '' && strtolower($status) !== 'all') {
            $normalizedStatus = strtoupper($status);
            if ($normalizedStatus === 'OUT OF STOCK') {
                $whereClauses[] = "p.stock_quantity <= 0";
            } else if ($normalizedStatus === 'LOW STOCK') {
                $whereClauses[] = "(p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold)";
            } else if ($normalizedStatus === 'IN STOCK') {
                $whereClauses[] = "p.stock_quantity > p.low_stock_threshold";
            }
        }

        $whereSql = !empty($whereClauses) ? ' WHERE ' . implode(' AND ', $whereClauses) : '';

        $query = "
            SELECT 
                p.name as 'Product Name', 
                p.sku as 'SKU', 
                COALESCE(c.name, 'Uncategorized') as 'Category', 
                COALESCE(b.name, 'Generic') as 'Brand',
                p.stock_quantity as 'Current Stock', 
                p.low_stock_threshold as 'Low Stock Limit', 
                CASE 
                    WHEN p.stock_quantity <= 0 THEN 'OUT OF STOCK'
                    WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW STOCK'
                    ELSE 'IN STOCK'
                END as 'Stock Status',
                ROUND(COALESCE(NULLIF(p.sale_price, 0), p.price), 2) as 'Unit Price',
                ROUND(p.stock_quantity * COALESCE(NULLIF(p.sale_price, 0), p.price), 2) as 'Inventory Value',
                DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i') as 'Last Updated'
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            {$whereSql}
            ORDER BY p.name ASC
        ";
        
        try {
            $stmt = $this->db->prepare($query);
            foreach ($params as $key => $val) {
                $stmt->bindValue($key, $val);
            }
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $products]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to export inventory."]);
        }
    }
}
?>
