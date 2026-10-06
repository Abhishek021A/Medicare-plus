<?php
// backend/controllers/BrandController.php
require_once '../config/database.php';
require_once '../models/Brand.php';

class BrandController {
    private $method;
    private $id;
    private $db;
    private $brand;

    public function __construct($method, $id = null) {
        $this->method = $method;
        $this->id = $id;

        $database = new Database();
        $this->db = $database->getConnection();
        $this->brand = new Brand($this->db);
    }

    public function processRequest() {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? '';
        $isAdmin = strpos($authHeader, 'Bearer mock-admin-token-123') !== false;
        
        // Handle PUT via POST with _method
        if ($this->method === 'POST' && isset($_POST['_method']) && $_POST['_method'] === 'PUT') {
            $this->method = 'PUT';
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id) {
                    if (is_numeric($this->id)) {
                        $this->getBrand($this->id);
                    } else {
                        $this->getBrandBySlug($this->id);
                    }
                } else {
                    $this->getBrands($isAdmin);
                }
                break;
            case 'POST':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->createBrand();
                break;
            case 'PUT':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->updateBrand($this->id);
                break;
            case 'PATCH':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->patchBrand($this->id);
                break;
            case 'DELETE':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->deleteBrand($this->id);
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getBrands($isAdmin) {
        $search = $_GET['search'] ?? '';
        $category = $_GET['category'] ?? $_GET['categories'] ?? null;
        
        $stmt = $isAdmin ? $this->brand->readAllAdmin($search) : $this->brand->readAllActive($category);
        $brands = [];
        if ($stmt) {
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $row['product_count'] = (int)($row['product_count'] ?? 0);
                $brands[] = $row;
            }
        }
        echo json_encode(["success" => true, "data" => $brands]);
    }

    private function getBrand($id) {
        $result = $this->brand->getById($id);
        if ($result) {
            echo json_encode(["success" => true, "data" => $result]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Brand not found"]);
        }
    }

    private function getBrandBySlug($slug) {
        $result = $this->brand->getBySlug($slug);
        if ($result) {
            echo json_encode(["success" => true, "data" => $result]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Brand not found"]);
        }
    }

    private function handleLogoUpload() {
        if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../uploads/brands/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $fileName = time() . '_' . basename($_FILES['logo']['name']);
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['logo']['tmp_name'], $targetPath)) {
                return 'uploads/brands/' . $fileName;
            }
        }
        return null;
    }

    private function createBrand() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST; 

        $this->brand->name = $data['name'] ?? '';
        $this->brand->slug = $data['slug'] ?? '';
        $this->brand->description = $data['description'] ?? '';
        $this->brand->website = $data['website'] ?? '';
        $this->brand->status = $data['status'] ?? 'ACTIVE';
        $this->brand->sort_order = $data['sort_order'] ?? 0;
        
        $featured = isset($data['featured']) ? $data['featured'] : false;
        $this->brand->featured = ($featured === 'true' || $featured === '1' || $featured === true);
        
        if(empty($this->brand->name) || empty($this->brand->slug)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand Name and slug are required."]);
            return;
        }

        if ($this->brand->isSlugExists($this->brand->slug)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand slug already exists."]);
            return;
        }

        $imagePath = $this->handleLogoUpload();
        if ($imagePath) {
            $this->brand->logo = $imagePath;
        }

        if ($this->brand->create()) {
            http_response_code(201);
            echo json_encode([
                "success" => true, 
                "message" => "Brand created successfully.",
                "data" => ["id" => $this->brand->id]
            ]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to create brand."]);
        }
    }

    private function updateBrand($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand ID is required."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST; 

        $this->brand->id = $id;
        $this->brand->name = $data['name'] ?? '';
        $this->brand->slug = $data['slug'] ?? '';
        $this->brand->description = $data['description'] ?? '';
        $this->brand->website = $data['website'] ?? '';
        $this->brand->status = $data['status'] ?? 'ACTIVE';
        $this->brand->sort_order = $data['sort_order'] ?? 0;
        
        $featured = isset($data['featured']) ? $data['featured'] : false;
        $this->brand->featured = ($featured === 'true' || $featured === '1' || $featured === true);

        if(empty($this->brand->name) || empty($this->brand->slug)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand Name and slug are required."]);
            return;
        }

        if ($this->brand->isSlugExists($this->brand->slug, $id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand slug already exists."]);
            return;
        }

        $imagePath = $this->handleLogoUpload();
        if ($imagePath) {
            $this->brand->logo = $imagePath;
        } else {
            $this->brand->logo = null;
        }

        if ($this->brand->update()) {
            echo json_encode(["success" => true, "message" => "Brand updated successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to update brand."]);
        }
    }
    
    private function patchBrand($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) $data = $_POST; 
        
        if (isset($data['status'])) {
            if ($this->brand->updateStatus($id, $data['status'])) {
                echo json_encode(["success" => true, "message" => "Brand status updated."]);
                return;
            }
        }
        
        if (isset($data['featured'])) {
            $featured = ($data['featured'] === 'true' || $data['featured'] === '1' || $data['featured'] === true);
            if ($this->brand->updateFeatured($id, $featured)) {
                echo json_encode(["success" => true, "message" => "Brand featured status updated."]);
                return;
            }
        }
        
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid patch data."]);
    }

    private function deleteBrand($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Brand ID is required."]);
            return;
        }

        if ($this->brand->hasProducts($id)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Cannot delete this brand because products are assigned to it. Please reassign the products first."]);
            return;
        }

        $this->brand->id = $id;
        if ($this->brand->delete()) {
            echo json_encode(["success" => true, "message" => "Brand deleted successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to delete brand."]);
        }
    }
}
