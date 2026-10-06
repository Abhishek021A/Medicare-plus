<?php
// backend/controllers/ProductController.php
require_once '../config/database.php';
require_once '../models/Product.php';

class ProductController {
    private $method;
    private $id;
    private $db;
    private $product;
    private $upload_dir = '../uploads/products/';

    public function __construct($method, $id = null) {
        $this->method = $method;
        $this->id = $id;

        $database = new Database();
        $this->db = $database->getConnection();
        $this->product = new Product($this->db);
        
        if (!file_exists($this->upload_dir)) {
            mkdir($this->upload_dir, 0777, true);
        }
    }

    public function processRequest() {
        // Admin verification
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? '';
        $isAdmin = strpos($authHeader, 'Bearer mock-admin-token-123') !== false;

        switch ($this->method) {
            case 'GET':
                if ($this->id) {
                    $this->getProduct($this->id);
                } else {
                    $this->getProducts($isAdmin);
                }
                break;
            case 'POST':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                // Check for _method override for PUT
                if (isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
                    $this->updateProduct($this->id);
                } else {
                    $this->createProduct();
                }
                break;
            case 'PUT':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->updateProduct($this->id);
                break;
            case 'DELETE':
                if (!$isAdmin) {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Unauthorized"]);
                    break;
                }
                $this->deleteProduct($this->id);
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function getProducts($isAdmin) {
        if ($isAdmin) {
            $stmt = $this->product->readAllAdmin();
            $products = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $products[] = $row;
            }
            echo json_encode(["success" => true, "data" => $products]);
        } else {
            $params = [
                'search' => $_GET['search'] ?? null,
                'categories' => $_GET['categories'] ?? $_GET['category'] ?? null,
                'brands' => $_GET['brands'] ?? $_GET['brand'] ?? null,
                'price' => $_GET['price'] ?? null,
                'min_price' => $_GET['min_price'] ?? null,
                'max_price' => $_GET['max_price'] ?? null,
                'rating' => $_GET['rating'] ?? null,
                'sort' => $_GET['sort'] ?? null,
                'page' => $_GET['page'] ?? null,
                'limit' => $_GET['limit'] ?? null,
                'new_launch' => $_GET['new_launch'] ?? null,
                'deals' => $_GET['deals'] ?? $_GET['special_deals'] ?? null,
                'featured' => $_GET['featured'] ?? null
            ];
            $result = $this->product->filterProducts($params);
            echo json_encode([
                "success" => true, 
                "data" => $result
            ]);
        }
    }

    private function getProduct($id) {
        $result = $this->product->readOne($id);
        if ($result) {
            // Also fetch gallery images
            $galleryStmt = $this->db->prepare("SELECT * FROM product_images WHERE product_id = :id ORDER BY sort_order ASC");
            $galleryStmt->bindParam(':id', $id);
            $galleryStmt->execute();
            $result['gallery_images'] = $galleryStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $result]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Product not found"]);
        }
    }

    private function handleImageUpload($fileInputName) {
        if (isset($_FILES[$fileInputName]) && $_FILES[$fileInputName]['error'] === UPLOAD_ERR_OK) {
            $file_name = time() . '_' . basename($_FILES[$fileInputName]['name']);
            $target_file = $this->upload_dir . $file_name;
            
            if (move_uploaded_file($_FILES[$fileInputName]['tmp_name'], $target_file)) {
                return '/uploads/products/' . $file_name;
            }
        }
        return null;
    }

    private function handleGalleryUploads($product_id) {
        if (isset($_FILES['gallery_images']) && is_array($_FILES['gallery_images']['name'])) {
            $count = count($_FILES['gallery_images']['name']);
            $galleryStmt = $this->db->prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (:product_id, :image_url, :sort_order)");
            
            for ($i = 0; $i < $count; $i++) {
                if ($_FILES['gallery_images']['error'][$i] === UPLOAD_ERR_OK) {
                    $file_name = time() . '_' . $i . '_' . basename($_FILES['gallery_images']['name'][$i]);
                    $target_file = $this->upload_dir . $file_name;
                    
                    if (move_uploaded_file($_FILES['gallery_images']['tmp_name'][$i], $target_file)) {
                        $image_url = '/uploads/products/' . $file_name;
                        $galleryStmt->bindParam(':product_id', $product_id);
                        $galleryStmt->bindParam(':image_url', $image_url);
                        $galleryStmt->bindParam(':sort_order', $i);
                        $galleryStmt->execute();
                    }
                }
            }
        }
    }

    private function populateProductFromRequest($data) {
        $this->product->name = $data['name'] ?? '';
        $this->product->slug = $data['slug'] ?? '';
        $this->product->sku = $data['sku'] ?? '';
        $this->product->price = $data['price'] ?? 0;
        $this->product->sale_price = $data['sale_price'] ?? null;
        $this->product->stock_quantity = $data['stock_quantity'] ?? 0;
        $this->product->medicine_group_id = $data['medicine_group_id'] ?? null;
        $this->product->category_id = $data['category_id'] ?? null;
        $this->product->subcategory_id = $data['subcategory_id'] ?? null;
        $this->product->brand_id = $data['brand_id'] ?? null;
        $this->product->status = $data['status'] ?? 'ACTIVE';
        $this->product->description = $data['description'] ?? '';
        $this->product->short_description = $data['short_description'] ?? '';
        $this->product->prescription_required = isset($data['prescription_required']) && ($data['prescription_required'] === 'true' || $data['prescription_required'] == '1');
        $this->product->featured = isset($data['featured']) && ($data['featured'] === 'true' || $data['featured'] == '1');
        $this->product->bestseller = isset($data['bestseller']) && ($data['bestseller'] === 'true' || $data['bestseller'] == '1');
        $this->product->new_launch = isset($data['new_launch']) && ($data['new_launch'] === 'true' || $data['new_launch'] == '1');
        $this->product->ingredients = $data['ingredients'] ?? '';
        $this->product->usage_instructions = $data['usage_instructions'] ?? '';
        $this->product->warnings = $data['warnings'] ?? '';
    }

    private function createProduct() {
        // If content-type is application/json, parse php://input. Otherwise, use $_POST.
        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents("php://input"), true);
        } else {
            $data = $_POST;
        }

        if (!$data) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid payload"]);
            return;
        }

        $this->populateProductFromRequest($data);

        if (empty($this->product->name) || empty($this->product->sku) || empty($this->product->slug)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name, Slug and SKU are required."]);
            return;
        }

        try {
            if ($this->db === null) {
                throw new Exception("Database connection failed. Please ensure MySQL is running.");
            }
            $this->db->beginTransaction();

            $image_url = $this->handleImageUpload('image');
            if ($image_url) {
                $this->product->image = $image_url;
            }

            if ($this->product->create()) {
                $product_id = $this->product->id;
                
                // Handle Gallery images
                $this->handleGalleryUploads($product_id);

                $this->db->commit();
                http_response_code(201);
                echo json_encode(["success" => true, "message" => "Product created successfully.", "data" => ["id" => $product_id]]);
            } else {
                $this->db->rollBack();
                http_response_code(503);
                echo json_encode(["success" => false, "message" => "Unable to create product due to database error."]);
            }
        } catch (Exception $e) {
            if ($this->db !== null && $this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    private function updateProduct($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product ID is required."]);
            return;
        }

        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents("php://input"), true);
        } else {
            $data = $_POST;
        }

        $this->product->id = $id;
        $this->populateProductFromRequest($data);

        try {
            if ($this->db === null) {
                throw new Exception("Database connection failed. Please ensure MySQL is running.");
            }
            $this->db->beginTransaction();

            $image_url = $this->handleImageUpload('image');
            if ($image_url) {
                $this->product->image = $image_url;
            }

            if ($this->product->update()) {
                // For gallery images on update, append new images. 
                // Detailed management (delete existing) would require a more complex payload.
                $this->handleGalleryUploads($id);

                $this->db->commit();
                echo json_encode(["success" => true, "message" => "Product updated successfully."]);
            } else {
                $this->db->rollBack();
                http_response_code(503);
                echo json_encode(["success" => false, "message" => "Unable to update product."]);
            }
        } catch (Exception $e) {
            if ($this->db !== null && $this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    private function deleteProduct($id) {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Product ID is required."]);
            return;
        }

        $this->product->id = $id;

        if ($this->product->delete()) {
            echo json_encode(["success" => true, "message" => "Product deleted successfully."]);
        } else {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Unable to delete product."]);
        }
    }
}
?>
