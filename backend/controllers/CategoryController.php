<?php
// backend/controllers/CategoryController.php
require_once '../config/database.php';
require_once '../models/Category.php';

class CategoryController {
    private $method;
    private $id;
    private $db;
    private $category;

    public function __construct($method, $id = null) {
        $this->method = $method;
        $this->id = $id;

        $database = new Database();
        $this->db = $database->getConnection();
        $this->category = new Category($this->db);
    }

    public function processRequest() {
        // Very basic JWT token validation simulation for admin routes (in production, use real JWT verification)
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? '';
        $isAdmin = strpos($authHeader, 'Bearer mock-admin-token-123') !== false;
        
        // We allow GET requests for the customer frontend, but state-changing requests need admin auth.
        // Also if we receive ?_method=PUT in POST, we handle it as PUT.
        if ($this->method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
            $this->method = 'PUT';
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id) {
                    if (is_numeric($this->id)) {
                        $this->getCategory($this->id);
                    } else {
                        $this->getCategoryBySlug($this->id);
                    }
                } else {
                    // If isAdmin, fetch all data for dashboard, otherwise just active ones
                    $this->getCategories($isAdmin);
                }
                break;
            case 'POST':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->createCategory();
                break;
            case 'PUT':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->updateCategory($this->id);
                break;
            case 'DELETE':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->deleteCategory($this->id);
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getCategories($isAdmin) {
        $stmt = $isAdmin ? $this->category->readAllAdmin() : $this->category->readAll();
        $categories = [];
        if ($stmt) {
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $categories[] = $row;
            }
        }
        echo json_encode(["success" => true, "data" => $categories]);
    }

    private function getCategory($id) {
        $result = $this->category->getById($id);
        if ($result) {
            echo json_encode(["success" => true, "data" => $result]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Category not found"]);
        }
    }

    private function getCategoryBySlug($slug) {
        $result = $this->category->getBySlug($slug);
        if ($result) {
            echo json_encode(["success" => true, "data" => $result]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Category not found"]);
        }
    }

    private function handleImageUpload() {
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/categories/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileName = time() . '_' . basename($_FILES['image']['name']);
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                return 'uploads/categories/' . $fileName;
            }
        }
        return null;
    }

    private function createCategory() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST; // Fallback to form-data

        $this->category->name = $data['name'] ?? '';
        $this->category->slug = $data['slug'] ?? '';
        $this->category->description = $data['description'] ?? '';
        $this->category->parent_id = $data['parent_id'] ?? null;
        $this->category->status = $data['status'] ?? 'ACTIVE';
        $this->category->sort_order = $data['sort_order'] ?? 0;
        
        $showOnHome = isset($data['show_on_homepage']) ? $data['show_on_homepage'] : false;
        if ($showOnHome === 'true' || $showOnHome === '1' || $showOnHome === true) {
            $this->category->show_on_homepage = true;
        } else {
            $this->category->show_on_homepage = false;
        }
        
        $imagePath = $this->handleImageUpload();
        if ($imagePath) {
            $this->category->image = $imagePath;
        }

        if(empty($this->category->name) || empty($this->category->slug)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name and slug are required."]);
            return;
        }

        if ($this->category->create()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Category created successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to create category."]);
        }
    }

    private function updateCategory($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Category ID is required."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST; // Fallback to form-data for PUT masquerading as POST

        $this->category->id = $id;
        $this->category->name = $data['name'] ?? '';
        $this->category->slug = $data['slug'] ?? '';
        $this->category->description = $data['description'] ?? '';
        $this->category->parent_id = $data['parent_id'] ?? null;
        $this->category->status = $data['status'] ?? 'ACTIVE';
        $this->category->sort_order = $data['sort_order'] ?? 0;
        
        $showOnHome = isset($data['show_on_homepage']) ? $data['show_on_homepage'] : false;
        if ($showOnHome === 'true' || $showOnHome === '1' || $showOnHome === true) {
            $this->category->show_on_homepage = true;
        } else {
            $this->category->show_on_homepage = false;
        }
        
        $imagePath = $this->handleImageUpload();
        if ($imagePath) {
            $this->category->image = $imagePath;
        } else {
            $this->category->image = null;
        }

        if ($this->category->update()) {
            echo json_encode(["success" => true, "message" => "Category updated successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to update category."]);
        }
    }

    private function deleteCategory($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Category ID is required."]);
            return;
        }

        $this->category->id = $id;
        
        if ($this->category->hasProducts()) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "message" => "This category contains products. Please move those products to another category before deleting."
            ]);
            return;
        }

        if ($this->category->hasSubcategories()) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "message" => "This category contains subcategories. Please delete or move them first."
            ]);
            return;
        }

        if ($this->category->delete()) {
            echo json_encode(["success" => true, "message" => "Category deleted successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to delete category."]);
        }
    }
}
?>
