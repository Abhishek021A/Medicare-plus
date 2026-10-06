<?php
// backend/controllers/AddressController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class AddressController {
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
                $this->getAddresses();
                break;
            case 'POST':
                $this->createAddress();
                break;
            case 'PUT':
                $this->updateAddress();
                break;
            case 'DELETE':
                $this->deleteAddress();
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getAddresses() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $query = "SELECT * FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC, id DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $addresses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "addresses" => $addresses
        ]);
    }

    private function createAddress() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['address_line_1']) || empty($data['city']) || empty($data['state']) || empty($data['pin_code'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Address, City, State and PIN Code are required."]);
            return;
        }

        $query = "INSERT INTO addresses (user_id, address_line_1, address_line_2, city, state, pin_code, landmark, is_default) 
                  VALUES (:user_id, :line1, :line2, :city, :state, :pin, :landmark, :is_default)";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindParam(':line1', $data['address_line_1']);
        $line2 = $data['address_line_2'] ?? null;
        $stmt->bindParam(':line2', $line2);
        $stmt->bindParam(':city', $data['city']);
        $stmt->bindParam(':state', $data['state']);
        $stmt->bindParam(':pin', $data['pin_code']);
        $landmark = $data['landmark'] ?? null;
        $stmt->bindParam(':landmark', $landmark);
        $isDefault = !empty($data['is_default']) ? 1 : 0;
        $stmt->bindParam(':is_default', $isDefault, PDO::PARAM_INT);
        $stmt->execute();

        $newId = (int)$this->db->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Address added successfully",
            "address_id" => $newId
        ]);
    }

    private function updateAddress() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $addressId = (int)$this->id;
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$addressId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Address ID is required"]);
            return;
        }

        $query = "UPDATE addresses SET 
                  address_line_1 = :line1, 
                  address_line_2 = :line2, 
                  city = :city, 
                  state = :state, 
                  pin_code = :pin, 
                  landmark = :landmark 
                  WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':line1', $data['address_line_1']);
        $line2 = $data['address_line_2'] ?? null;
        $stmt->bindParam(':line2', $line2);
        $stmt->bindParam(':city', $data['city']);
        $stmt->bindParam(':state', $data['state']);
        $stmt->bindParam(':pin', $data['pin_code']);
        $landmark = $data['landmark'] ?? null;
        $stmt->bindParam(':landmark', $landmark);
        $stmt->bindParam(':id', $addressId, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Address updated successfully"
        ]);
    }

    private function deleteAddress() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];
        $addressId = (int)$this->id;

        $query = "DELETE FROM addresses WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $addressId, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Address deleted successfully"
        ]);
    }
}
?>
