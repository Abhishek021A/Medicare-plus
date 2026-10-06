<?php
// backend/controllers/StatsController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class StatsController {
    private $method;
    private $db;

    public function __construct($method) {
        $this->method = $method;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function processRequest() {
        $user = AuthMiddleware::getAuthenticatedUser($this->db);
        $allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'];
        if (!$user || !in_array($user['role'] ?? '', $allowedRoles)) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized access to statistics."]);
            return;
        }

        switch ($this->method) {
            case 'GET':
                $this->getBadges();
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getBadges() {
        if (!$this->db) {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Database connection error"]);
            return;
        }

        try {
            // Count pending orders
            $queryOrders = "SELECT COUNT(*) as count FROM orders WHERE order_status = 'PENDING'";
            $stmtOrders = $this->db->prepare($queryOrders);
            $stmtOrders->execute();
            $pendingOrders = $stmtOrders->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

            // Count pending prescriptions
            $queryPrescriptions = "SELECT COUNT(*) as count FROM prescriptions WHERE status = 'PENDING'";
            $stmtPrescriptions = $this->db->prepare($queryPrescriptions);
            $stmtPrescriptions->execute();
            $pendingPrescriptions = $stmtPrescriptions->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

            // Count pending reviews
            $queryReviews = "SELECT COUNT(*) as count FROM reviews WHERE status = 'PENDING' AND deleted_at IS NULL";
            $stmtReviews = $this->db->prepare($queryReviews);
            $stmtReviews->execute();
            $pendingReviews = $stmtReviews->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

            // Count unread notifications
            $queryNotifs = "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND deleted_at IS NULL";
            $stmtNotifs = $this->db->prepare($queryNotifs);
            $stmtNotifs->execute();
            $unreadNotifications = $stmtNotifs->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

            echo json_encode([
                "success" => true,
                "data" => [
                    "pending_orders" => (int)$pendingOrders,
                    "pending_prescriptions" => (int)$pendingPrescriptions,
                    "pending_reviews" => (int)$pendingReviews,
                    "unread_notifications" => (int)$unreadNotifications
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }
}
?>
