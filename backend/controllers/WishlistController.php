<?php
// backend/controllers/WishlistController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class WishlistController {
    private $method;
    private $id;
    private $db;

    public function __construct($method, $id = null) {
        $this->method = $method;
        $this->id = $id;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function processRequest() {
        switch ($this->method) {
            case 'GET':
                if ($this->id === 'check') {
                    $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
                    $this->checkWishlist($productId);
                } elseif ($this->id && is_numeric($this->id)) {
                    $this->checkWishlist((int)$this->id);
                } else {
                    $this->getWishlist();
                }
                break;
            case 'POST':
                $this->addToWishlist();
                break;
            case 'DELETE':
                $this->removeFromWishlist();
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getOrCreateWishlistId($userId) {
        $query = "SELECT id FROM wishlists WHERE user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $wishlist = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($wishlist) {
            return (int)$wishlist['id'];
        }

        $insert = "INSERT INTO wishlists (user_id) VALUES (:user_id)";
        $insStmt = $this->db->prepare($insert);
        $insStmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $insStmt->execute();
        return (int)$this->db->lastInsertId();
    }

    private function getWishlist() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $wishlistId = $this->getOrCreateWishlistId($userId);

        $query = "SELECT wi.id as wishlist_item_id, p.* 
                  FROM wishlist_items wi 
                  JOIN products p ON wi.product_id = p.id 
                  WHERE wi.wishlist_id = :wishlist_id 
                  ORDER BY wi.id DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':wishlist_id', $wishlistId, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as &$item) {
            $item['id'] = (int)$item['id'];
            $item['product_id'] = (int)$item['id'];
            $item['is_wishlisted'] = true;
            $item['price'] = (float)$item['price'];
            $item['sale_price'] = $item['sale_price'] !== null ? (float)$item['sale_price'] : null;
            $item['stock_quantity'] = (int)$item['stock_quantity'];
        }

        echo json_encode([
            "success" => true,
            "items" => $items,
            "count" => count($items)
        ]);
    }

    private function addToWishlist() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) {
            $data = $_POST;
        }

        $productId = (int)($data['productId'] ?? $data['product_id'] ?? 0);
        if (!$productId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product ID is required"]);
            return;
        }

        // Verify product exists and is active
        $prodStmt = $this->db->prepare("SELECT id, status, name FROM products WHERE id = :id LIMIT 1");
        $prodStmt->bindParam(':id', $productId, PDO::PARAM_INT);
        $prodStmt->execute();
        $product = $prodStmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Product not found"]);
            return;
        }

        if (isset($product['status']) && $product['status'] === 'INACTIVE') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product is currently inactive"]);
            return;
        }

        $wishlistId = $this->getOrCreateWishlistId($userId);

        // Check if already in wishlist
        $check = "SELECT id FROM wishlist_items WHERE wishlist_id = :wishlist_id AND product_id = :product_id LIMIT 1";
        $chkStmt = $this->db->prepare($check);
        $chkStmt->bindParam(':wishlist_id', $wishlistId, PDO::PARAM_INT);
        $chkStmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
        $chkStmt->execute();

        if ($chkStmt->fetch()) {
            echo json_encode([
                "success" => true, 
                "message" => "Item already in wishlist",
                "product_id" => $productId,
                "is_wishlisted" => true
            ]);
            return;
        }

        $insert = "INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (:wishlist_id, :product_id)";
        $insStmt = $this->db->prepare($insert);
        $insStmt->bindParam(':wishlist_id', $wishlistId, PDO::PARAM_INT);
        $insStmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
        $insStmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Added to wishlist",
            "product_id" => $productId,
            "is_wishlisted" => true
        ]);
    }

    private function removeFromWishlist() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $productId = (int)$this->id;
        if (!$productId) {
            $data = json_decode(file_get_contents("php://input"), true);
            $productId = (int)($data['productId'] ?? $data['product_id'] ?? ($_GET['product_id'] ?? 0));
        }

        if (!$productId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product ID is required"]);
            return;
        }

        $wishlistId = $this->getOrCreateWishlistId($userId);

        $query = "DELETE FROM wishlist_items WHERE wishlist_id = :wishlist_id AND product_id = :product_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':wishlist_id', $wishlistId, PDO::PARAM_INT);
        $stmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Removed from wishlist",
            "product_id" => $productId,
            "is_wishlisted" => false
        ]);
    }

    private function checkWishlist($productId) {
        $currentUser = AuthMiddleware::getAuthenticatedUser($this->db);
        if (!$currentUser || !$productId) {
            echo json_encode(["success" => true, "is_wishlisted" => false]);
            return;
        }

        $userId = (int)$currentUser['id'];
        $wishlistId = $this->getOrCreateWishlistId($userId);

        $check = "SELECT id FROM wishlist_items WHERE wishlist_id = :wishlist_id AND product_id = :product_id LIMIT 1";
        $chkStmt = $this->db->prepare($check);
        $chkStmt->bindParam(':wishlist_id', $wishlistId, PDO::PARAM_INT);
        $chkStmt->bindParam(':product_id', $productId, PDO::PARAM_INT);
        $chkStmt->execute();

        echo json_encode([
            "success" => true,
            "is_wishlisted" => (bool)$chkStmt->fetch()
        ]);
    }
}
?>
