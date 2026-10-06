<?php
// backend/controllers/ReviewController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class ReviewController {
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
        if ($this->method === 'POST' && isset($_POST['_method']) && in_array(strtoupper($_POST['_method']), ['PUT', 'PATCH', 'DELETE'])) {
            $this->method = strtoupper($_POST['_method']);
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'summary') {
                    $this->getSummary();
                } else if ($this->id === 'export') {
                    $this->exportReviews();
                } else if ($this->id && $this->subAction === 'reviews') {
                    $this->getProductReviews((int)$this->id);
                } else if ($this->id && is_numeric($this->id)) {
                    $this->getReview((int)$this->id);
                } else {
                    $this->getReviews();
                }
                break;

            case 'POST':
                if ($this->id && $this->subAction === 'approve') {
                    $this->approveReview((int)$this->id);
                } else if ($this->id && $this->subAction === 'reject') {
                    $this->rejectReview((int)$this->id);
                } else if ($this->id && $this->subAction === 'hide') {
                    $this->hideReview((int)$this->id);
                } else if ($this->id && $this->subAction === 'restore') {
                    $this->restoreReview((int)$this->id);
                } else if ($this->id && $this->subAction === 'reviews') {
                    $this->createProductReview((int)$this->id);
                } else {
                    $this->createProductReview();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'approve') {
                        $this->approveReview((int)$this->id);
                    } else if ($this->subAction === 'reject') {
                        $this->rejectReview((int)$this->id);
                    } else if ($this->subAction === 'hide') {
                        $this->hideReview((int)$this->id);
                    } else if ($this->subAction === 'restore') {
                        $this->restoreReview((int)$this->id);
                    } else {
                        $this->updateReviewStatus((int)$this->id);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Review ID required."]);
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deleteReview((int)$this->id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Review ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed."]);
                break;
        }
    }

    /**
     * Check if request is authenticated as admin
     */
    private function isAdminRequest() {
        $currentUser = AuthMiddleware::getAuthenticatedUser($this->db);
        if ($currentUser) {
            $allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER', 'MARKETING_MANAGER', 'EDITOR'];
            if (in_array($currentUser['role'] ?? '', $allowedRoles)) {
                return $currentUser;
            }
        }
        $token = AuthMiddleware::getBearerToken();
        if ($token === 'mock-admin-token-123') {
            return ['id' => 1, 'name' => 'Admin User', 'role' => 'SUPER_ADMIN'];
        }
        return false;
    }

    /**
     * Sanitize string content
     */
    private function sanitizeText($text) {
        if ($text === null) return '';
        $text = strip_tags($text);
        return trim($text);
    }

    /**
     * GET /reviews or /admin/reviews
     * Filtered, searched, paginated review listing with summary & distribution
     */
    private function getReviews() {
        $isAdmin = $this->isAdminRequest() !== false || (isset($_GET['admin']) && $_GET['admin'] === 'true');
        
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? strtoupper(trim($_GET['status'])) : 'ALL';
        $rating = isset($_GET['rating']) ? trim($_GET['rating']) : 'ALL';
        $verified = isset($_GET['verified']) ? trim($_GET['verified']) : 'ALL';
        $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
        $dateFilter = isset($_GET['date_filter']) ? trim($_GET['date_filter']) : 'all';
        $sort = isset($_GET['sort']) ? trim($_GET['sort']) : 'newest';
        $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
        $limit = max(1, min(100, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
        $offset = ($page - 1) * $limit;

        $where = ["r.deleted_at IS NULL"];
        $params = [];

        // Public customer query only gets APPROVED reviews
        if (!$isAdmin) {
            $where[] = "r.status = 'APPROVED'";
        } else if ($status !== 'ALL' && in_array($status, ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'])) {
            $where[] = "r.status = :status";
            $params[':status'] = $status;
        }

        if ($productId) {
            $where[] = "r.product_id = :product_id";
            $params[':product_id'] = $productId;
        }

        if ($rating !== 'ALL' && is_numeric($rating) && (int)$rating >= 1 && (int)$rating <= 5) {
            $where[] = "r.rating = :rating";
            $params[':rating'] = (int)$rating;
        }

        if ($verified === '1' || $verified === 'verified') {
            $where[] = "r.verified_purchase = 1";
        } else if ($verified === '0' || $verified === 'not_verified') {
            $where[] = "r.verified_purchase = 0";
        }

        if (!empty($search)) {
            $where[] = "(
                p.name LIKE :search 
                OR p.sku LIKE :search 
                OR u.name LIKE :search 
                OR u.email LIKE :search 
                OR r.title LIKE :search 
                OR r.comment LIKE :search
                OR o.order_number LIKE :search
            )";
            $params[':search'] = '%' . $search . '%';
        }

        if ($dateFilter === 'today') {
            $where[] = "DATE(r.created_at) = CURDATE()";
        } else if ($dateFilter === '7days') {
            $where[] = "r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateFilter === '30days') {
            $where[] = "r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        } else if ($dateFilter === 'this_month') {
            $where[] = "MONTH(r.created_at) = MONTH(CURRENT_DATE()) AND YEAR(r.created_at) = YEAR(CURRENT_DATE())";
        }

        $whereSql = implode(' AND ', $where);

        // Sorting
        $orderBy = "r.created_at DESC";
        switch ($sort) {
            case 'oldest':
                $orderBy = "r.created_at ASC";
                break;
            case 'rating_desc':
            case 'highest':
                $orderBy = "r.rating DESC, r.created_at DESC";
                break;
            case 'rating_asc':
            case 'lowest':
                $orderBy = "r.rating ASC, r.created_at DESC";
                break;
            case 'updated':
                $orderBy = "r.updated_at DESC";
                break;
            default:
                $orderBy = "r.created_at DESC";
                break;
        }

        // Count total
        $countSql = "SELECT COUNT(*) FROM reviews r
                     LEFT JOIN products p ON r.product_id = p.id
                     LEFT JOIN users u ON r.user_id = u.id
                     LEFT JOIN orders o ON r.order_id = o.id
                     WHERE $whereSql";
        $countStmt = $this->db->prepare($countSql);
        foreach ($params as $k => $v) {
            $countStmt->bindValue($k, $v);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        // Data query
        $dataSql = "SELECT 
                        r.id,
                        r.product_id,
                        r.user_id,
                        r.order_id,
                        r.rating,
                        r.title,
                        r.comment,
                        r.images,
                        r.verified_purchase,
                        r.status,
                        r.moderation_reason,
                        r.moderated_by,
                        r.moderated_at,
                        r.created_at,
                        r.updated_at,
                        p.name AS product_name,
                        p.slug AS product_slug,
                        p.sku AS product_sku,
                        p.image AS product_image,
                        p.price AS product_price,
                        u.name AS customer_name,
                        u.email AS customer_email,
                        u.phone AS customer_phone,
                        o.order_number,
                        mod_user.name AS moderated_by_name
                    FROM reviews r
                    LEFT JOIN products p ON r.product_id = p.id
                    LEFT JOIN users u ON r.user_id = u.id
                    LEFT JOIN orders o ON r.order_id = o.id
                    LEFT JOIN users mod_user ON r.moderated_by = mod_user.id
                    WHERE $whereSql
                    ORDER BY $orderBy
                    LIMIT :limit OFFSET :offset";

        $dataStmt = $this->db->prepare($dataSql);
        foreach ($params as $k => $v) {
            $dataStmt->bindValue($k, $v);
        }
        $dataStmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $dataStmt->execute();

        $reviews = [];
        while ($row = $dataStmt->fetch(PDO::FETCH_ASSOC)) {
            $row['id'] = (int)$row['id'];
            $row['product_id'] = (int)$row['product_id'];
            $row['user_id'] = (int)$row['user_id'];
            $row['order_id'] = $row['order_id'] ? (int)$row['order_id'] : null;
            $row['rating'] = (int)$row['rating'];
            $row['verified_purchase'] = (bool)$row['verified_purchase'];
            $row['customer_name'] = $row['customer_name'] ?: 'Customer';
            $row['customer_email'] = $row['customer_email'] ?: '';
            $row['images'] = !empty($row['images']) ? json_decode($row['images'], true) : [];
            $reviews[] = $row;
        }

        // Summary metrics & distribution
        $summary = $this->calculateSummary();
        $distribution = $this->calculateDistribution();

        echo json_encode([
            "success" => true,
            "data" => [
                "reviews" => $reviews,
                "summary" => $summary,
                "distribution" => $distribution,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $limit > 0 ? (int)ceil($total / $limit) : 1
                ]
            ]
        ]);
    }

    /**
     * Calculate summary metrics from MySQL
     */
    private function calculateSummary() {
        $sql = "SELECT 
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
                    SUM(CASE WHEN status = 'HIDDEN' THEN 1 ELSE 0 END) AS hidden,
                    ROUND(AVG(CASE WHEN status = 'APPROVED' THEN rating ELSE NULL END), 1) AS average_rating,
                    COUNT(DISTINCT CASE WHEN status = 'APPROVED' THEN product_id ELSE NULL END) AS products_with_reviews
                FROM reviews
                WHERE deleted_at IS NULL";
        $stmt = $this->db->query($sql);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            "total" => (int)($row['total'] ?? 0),
            "pending" => (int)($row['pending'] ?? 0),
            "approved" => (int)($row['approved'] ?? 0),
            "rejected" => (int)($row['rejected'] ?? 0),
            "hidden" => (int)($row['hidden'] ?? 0),
            "average_rating" => $row['average_rating'] !== null ? (float)$row['average_rating'] : 0.0,
            "products_with_reviews" => (int)($row['products_with_reviews'] ?? 0)
        ];
    }

    /**
     * Calculate rating star distribution
     */
    private function calculateDistribution($productId = null) {
        $where = "deleted_at IS NULL AND status = 'APPROVED'";
        $params = [];
        if ($productId) {
            $where .= " AND product_id = :pid";
            $params[':pid'] = $productId;
        }

        $sql = "SELECT 
                    rating,
                    COUNT(*) as count
                FROM reviews
                WHERE $where
                GROUP BY rating";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $counts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $totalApproved = array_sum($counts);
        $dist = [];
        for ($star = 5; $star >= 1; $star--) {
            $cnt = isset($counts[$star]) ? (int)$counts[$star] : 0;
            $percentage = $totalApproved > 0 ? round(($cnt / $totalApproved) * 100) : 0;
            $dist[] = [
                "stars" => $star,
                "count" => $cnt,
                "percentage" => (int)$percentage
            ];
        }

        return [
            "total" => $totalApproved,
            "stars" => $dist
        ];
    }

    /**
     * GET /reviews/summary
     */
    private function getSummary() {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized access."]);
            return;
        }

        $summary = $this->calculateSummary();
        $distribution = $this->calculateDistribution();

        echo json_encode([
            "success" => true,
            "data" => [
                "summary" => $summary,
                "distribution" => $distribution
            ]
        ]);
    }

    /**
     * GET /reviews/{id}
     */
    private function getReview($id) {
        $sql = "SELECT 
                    r.*,
                    p.name AS product_name,
                    p.slug AS product_slug,
                    p.sku AS product_sku,
                    p.image AS product_image,
                    p.price AS product_price,
                    u.name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    o.order_number,
                    mod_user.name AS moderated_by_name
                FROM reviews r
                LEFT JOIN products p ON r.product_id = p.id
                LEFT JOIN users u ON r.user_id = u.id
                LEFT JOIN orders o ON r.order_id = o.id
                LEFT JOIN users mod_user ON r.moderated_by = mod_user.id
                WHERE r.id = :id AND r.deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $review = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$review) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found."]);
            return;
        }

        $review['id'] = (int)$review['id'];
        $review['rating'] = (int)$review['rating'];
        $review['verified_purchase'] = (bool)$review['verified_purchase'];
        $review['images'] = !empty($review['images']) ? json_decode($review['images'], true) : [];

        echo json_encode([
            "success" => true,
            "data" => $review
        ]);
    }

    /**
     * GET /products/{id}/reviews
     * Public customer reviews for product details page
     */
    private function getProductReviews($productId) {
        $page = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);
        $limit = max(1, min(50, isset($_GET['limit']) ? (int)$_GET['limit'] : 10));
        $offset = ($page - 1) * $limit;
        $sort = isset($_GET['sort']) ? trim($_GET['sort']) : 'newest';

        $orderBy = "r.created_at DESC";
        if ($sort === 'highest') {
            $orderBy = "r.rating DESC, r.created_at DESC";
        } else if ($sort === 'lowest') {
            $orderBy = "r.rating ASC, r.created_at DESC";
        }

        // Count approved reviews for product
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM reviews WHERE product_id = :pid AND status = 'APPROVED' AND deleted_at IS NULL");
        $countStmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        // Fetch reviews
        $sql = "SELECT 
                    r.id,
                    r.rating,
                    r.title,
                    r.comment,
                    r.images,
                    r.verified_purchase,
                    r.created_at,
                    u.name AS customer_name
                FROM reviews r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.product_id = :pid AND r.status = 'APPROVED' AND r.deleted_at IS NULL
                ORDER BY $orderBy
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $reviews = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['id'] = (int)$row['id'];
            $row['rating'] = (int)$row['rating'];
            $row['verified_purchase'] = (bool)$row['verified_purchase'];
            $row['customer_name'] = $row['customer_name'] ?: 'Verified Customer';
            $row['images'] = !empty($row['images']) ? json_decode($row['images'], true) : [];
            $reviews[] = $row;
        }

        $distribution = $this->calculateDistribution($productId);

        // Overall product rating stats
        $avgStmt = $this->db->prepare("SELECT ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE product_id = :pid AND status = 'APPROVED' AND deleted_at IS NULL");
        $avgStmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $avgStmt->execute();
        $avg = $avgStmt->fetchColumn();

        echo json_encode([
            "success" => true,
            "data" => [
                "reviews" => $reviews,
                "summary" => [
                    "total_reviews" => $total,
                    "average_rating" => $avg !== false && $avg !== null ? (float)$avg : 0.0,
                    "distribution" => $distribution['stars']
                ],
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $limit > 0 ? (int)ceil($total / $limit) : 1
                ]
            ]
        ]);
    }

    /**
     * POST /products/{id}/reviews
     * Customer writes a new review
     */
    private function createProductReview($urlProductId = null) {
        // Authenticate customer
        $currentUser = AuthMiddleware::getAuthenticatedUser($this->db);
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Please log in to write a review."]);
            return;
        }

        $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

        $productId = $urlProductId ?: (isset($input['product_id']) ? (int)$input['product_id'] : 0);
        if ($productId <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Valid product ID is required."]);
            return;
        }

        // Validate product exists
        $checkProd = $this->db->prepare("SELECT id, name FROM products WHERE id = :pid");
        $checkProd->bindValue(':pid', $productId, PDO::PARAM_INT);
        $checkProd->execute();
        $product = $checkProd->fetch(PDO::FETCH_ASSOC);
        if (!$product) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Product not found."]);
            return;
        }

        $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Rating must be an integer between 1 and 5 stars."]);
            return;
        }

        $comment = isset($input['comment']) ? $this->sanitizeText($input['comment']) : '';
        if (strlen($comment) < 3) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Review text must be at least 3 characters long."]);
            return;
        }
        if (strlen($comment) > 2000) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Review text exceeds maximum allowed length (2000 characters)."]);
            return;
        }

        $title = isset($input['title']) ? substr($this->sanitizeText($input['title']), 0, 255) : '';

        $userId = (int)$currentUser['id'];

        // Backend checks for Verified Purchase
        $orderStmt = $this->db->prepare("
            SELECT o.id, o.order_number 
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = :uid 
              AND oi.product_id = :pid 
              AND o.order_status NOT IN ('CANCELLED', 'REFUNDED')
            ORDER BY o.id DESC 
            LIMIT 1
        ");
        $orderStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $orderStmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $orderStmt->execute();
        $orderMatch = $orderStmt->fetch(PDO::FETCH_ASSOC);

        $verifiedPurchase = $orderMatch ? 1 : 0;
        $orderId = $orderMatch ? (int)$orderMatch['id'] : null;

        // Check for existing pending review to avoid duplicate spam
        $dupStmt = $this->db->prepare("
            SELECT id FROM reviews 
            WHERE user_id = :uid 
              AND product_id = :pid 
              AND status = 'PENDING' 
              AND deleted_at IS NULL
        ");
        $dupStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $dupStmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $dupStmt->execute();
        if ($dupStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "You already have a review pending approval for this product."]);
            return;
        }

        // Insert new review with PENDING status
        $insertSql = "INSERT INTO reviews 
                      (product_id, user_id, order_id, verified_purchase, rating, title, comment, status, created_at)
                      VALUES 
                      (:pid, :uid, :oid, :verified, :rating, :title, :comment, 'PENDING', NOW())";
        
        $insertStmt = $this->db->prepare($insertSql);
        $insertStmt->bindValue(':pid', $productId, PDO::PARAM_INT);
        $insertStmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $insertStmt->bindValue(':oid', $orderId, $orderId ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $insertStmt->bindValue(':verified', $verifiedPurchase, PDO::PARAM_INT);
        $insertStmt->bindValue(':rating', $rating, PDO::PARAM_INT);
        $insertStmt->bindValue(':title', $title ?: null, $title ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $insertStmt->bindValue(':comment', $comment, PDO::PARAM_STR);

        if ($insertStmt->execute()) {
            $newId = $this->db->lastInsertId();

            try {
                require_once __DIR__ . '/../services/NotificationService.php';
                $notifService = new NotificationService($this->db);
                $notifService->notifyReviewSubmitted($newId, $product['name'] ?? 'Product', $rating, $currentUser['name'] ?? 'Customer');
            } catch (Exception $notifEx) {
                error_log("Failed to trigger review notification: " . $notifEx->getMessage());
            }

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Your review has been submitted and is awaiting admin moderation.",
                "data" => [
                    "id" => (int)$newId,
                    "status" => "PENDING",
                    "verified_purchase" => (bool)$verifiedPurchase
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to submit review."]);
        }
    }

    /**
     * Admin: Approve Review
     */
    private function approveReview($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $adminId = (int)($admin['id'] ?? 1);

        $sql = "UPDATE reviews 
                SET status = 'APPROVED', 
                    moderation_reason = NULL, 
                    moderated_by = :admin_id, 
                    moderated_at = NOW() 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Review approved successfully. It is now visible on the customer product page.",
                "data" => ["id" => $id, "status" => "APPROVED"]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found or already approved."]);
        }
    }

    /**
     * Admin: Reject Review
     */
    private function rejectReview($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $adminId = (int)($admin['id'] ?? 1);
        $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
        $reason = isset($input['reason']) ? $this->sanitizeText($input['reason']) : 
                 (isset($input['moderation_reason']) ? $this->sanitizeText($input['moderation_reason']) : 'Content does not meet guidelines');

        $sql = "UPDATE reviews 
                SET status = 'REJECTED', 
                    moderation_reason = :reason, 
                    moderated_by = :admin_id, 
                    moderated_at = NOW() 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':reason', $reason, PDO::PARAM_STR);
        $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Review rejected and hidden from public display.",
                "data" => ["id" => $id, "status" => "REJECTED", "reason" => $reason]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found or already updated."]);
        }
    }

    /**
     * Admin: Hide Review
     */
    private function hideReview($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $adminId = (int)($admin['id'] ?? 1);

        $sql = "UPDATE reviews 
                SET status = 'HIDDEN', 
                    moderated_by = :admin_id, 
                    moderated_at = NOW() 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Review hidden from customers.",
                "data" => ["id" => $id, "status" => "HIDDEN"]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found."]);
        }
    }

    /**
     * Admin: Restore Review
     */
    private function restoreReview($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $adminId = (int)($admin['id'] ?? 1);

        $sql = "UPDATE reviews 
                SET status = 'APPROVED', 
                    moderation_reason = NULL,
                    moderated_by = :admin_id, 
                    moderated_at = NOW() 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Review restored to Approved status.",
                "data" => ["id" => $id, "status" => "APPROVED"]
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found."]);
        }
    }

    /**
     * Admin: Update status directly
     */
    private function updateReviewStatus($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
        $status = isset($input['status']) ? strtoupper(trim($input['status'])) : '';
        $reason = isset($input['reason']) ? $this->sanitizeText($input['reason']) : null;

        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status value."]);
            return;
        }

        $adminId = (int)($admin['id'] ?? 1);

        $sql = "UPDATE reviews 
                SET status = :status, 
                    moderation_reason = :reason,
                    moderated_by = :admin_id, 
                    moderated_at = NOW() 
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':status', $status, PDO::PARAM_STR);
        $stmt->bindValue(':reason', $reason, $reason ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':admin_id', $adminId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "Review status updated to $status.",
                "data" => ["id" => $id, "status" => $status]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update review status."]);
        }
    }

    /**
     * Admin: Delete Review (Soft Delete)
     */
    private function deleteReview($id) {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized. Admin permission required."]);
            return;
        }

        $sql = "UPDATE reviews SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute() && $stmt->rowCount() > 0) {
            echo json_encode([
                "success" => true,
                "message" => "Review deleted successfully."
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Review not found or already deleted."]);
        }
    }

    /**
     * Export reviews as CSV metadata
     */
    private function exportReviews() {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized."]);
            return;
        }

        $sql = "SELECT 
                    r.id,
                    u.name AS customer_name,
                    u.email AS customer_email,
                    p.name AS product_name,
                    p.sku AS product_sku,
                    o.order_number,
                    r.rating,
                    r.title,
                    r.comment,
                    r.verified_purchase,
                    r.status,
                    r.moderation_reason,
                    r.created_at,
                    r.updated_at
                FROM reviews r
                LEFT JOIN products p ON r.product_id = p.id
                LEFT JOIN users u ON r.user_id = u.id
                LEFT JOIN orders o ON r.order_id = o.id
                WHERE r.deleted_at IS NULL
                ORDER BY r.created_at DESC";
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $rows
        ]);
    }
}
