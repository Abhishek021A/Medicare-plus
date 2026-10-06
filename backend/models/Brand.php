<?php
// backend/models/Brand.php

class Brand {
    private $conn;
    private $table_name = "brands";

    public $id;
    public $name;
    public $slug;
    public $description;
    public $logo;
    public $website;
    public $status;
    public $featured;
    public $sort_order;
    public $created_at;
    public $updated_at;
    public $deleted_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function readAllActive($category = null) {
        $bindings = [];
        $whereCategory = "";
        
        if (!empty($category)) {
            $catList = is_array($category) ? $category : explode(',', (string)$category);
            $catList = array_filter(array_map('trim', $catList));
            
            if (!empty($catList)) {
                $catPlaceholders = [];
                foreach ($catList as $idx => $catVal) {
                    $placeholder = ":cat_" . $idx;
                    $catPlaceholders[] = $placeholder;
                    $bindings[$placeholder] = $catVal;
                }
                $catIn = implode(',', $catPlaceholders);
                
                $whereCategory = " AND (
                    c.slug IN ($catIn) 
                    OR p.category_id IN ($catIn) 
                    OR sc.slug IN ($catIn) 
                    OR p.subcategory_id IN ($catIn)
                    OR c.parent_id IN (SELECT id FROM categories WHERE slug IN ($catIn) OR id IN ($catIn))
                    OR sc.parent_id IN (SELECT id FROM categories WHERE slug IN ($catIn) OR id IN ($catIn))
                )";
            }
        }

        if (!empty($whereCategory)) {
            $query = "SELECT b.*, 
                             (SELECT COUNT(*) 
                              FROM products p 
                              LEFT JOIN categories c ON p.category_id = c.id
                              LEFT JOIN categories sc ON p.subcategory_id = sc.id
                              WHERE p.brand_id = b.id 
                                AND p.status = 'ACTIVE' 
                                $whereCategory
                             ) as product_count 
                      FROM " . $this->table_name . " b 
                      WHERE b.status = 'ACTIVE' AND b.deleted_at IS NULL 
                      HAVING product_count > 0
                      ORDER BY b.sort_order ASC, b.name ASC";
        } else {
            $query = "SELECT b.*, 
                             (SELECT COUNT(*) FROM products WHERE brand_id = b.id AND status = 'ACTIVE') as product_count 
                      FROM " . $this->table_name . " b 
                      WHERE b.status = 'ACTIVE' AND b.deleted_at IS NULL 
                      ORDER BY b.sort_order ASC, b.name ASC";
        }

        $stmt = $this->conn->prepare($query);
        foreach ($bindings as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->execute();
        return $stmt;
    }

    public function readAllAdmin($search = '') {
        $query = "
            SELECT 
                b.*, 
                (SELECT COUNT(*) FROM products WHERE brand_id = b.id) as product_count
            FROM " . $this->table_name . " b
            WHERE b.deleted_at IS NULL
        ";
        
        if (!empty($search)) {
            $query .= " AND (b.name LIKE :search OR b.slug LIKE :search)";
        }
        
        $query .= " ORDER BY b.sort_order ASC, b.name ASC";
        
        $stmt = $this->conn->prepare($query);
        
        if (!empty($search)) {
            $searchTerm = "%{$search}%";
            $stmt->bindParam(":search", $searchTerm);
        }
        
        $stmt->execute();
        return $stmt;
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? AND deleted_at IS NULL LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getBySlug($slug) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE slug = ? AND deleted_at IS NULL LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $slug);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function isSlugExists($slug, $exclude_id = null) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE slug = :slug";
        if ($exclude_id) {
            $query .= " AND id != :exclude_id";
        }
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':slug', $slug);
        if ($exclude_id) {
            $stmt->bindParam(':exclude_id', $exclude_id);
        }
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  (name, slug, description, logo, website, status, featured, sort_order) 
                  VALUES (:name, :slug, :description, :logo, :website, :status, :featured, :sort_order)";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(":name", $this->name);
            $stmt->bindParam(":slug", $this->slug);
            $stmt->bindParam(":description", $this->description);
            $stmt->bindParam(":logo", $this->logo);
            $stmt->bindParam(":website", $this->website);
            $stmt->bindParam(":status", $this->status);
            
            $featured = $this->featured ? 1 : 0;
            $stmt->bindParam(":featured", $featured, PDO::PARAM_INT);
            
            if(empty($this->sort_order)) {
                $stmt->bindValue(":sort_order", 0, PDO::PARAM_INT);
            } else {
                $stmt->bindParam(":sort_order", $this->sort_order);
            }
            
            if($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return true;
            }
        } catch (PDOException $e) {
            error_log("Brand create error: " . $e->getMessage());
            return false;
        }
        return false;
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . " SET 
                  name = :name, 
                  slug = :slug, 
                  description = :description, 
                  website = :website, 
                  status = :status, 
                  featured = :featured,
                  sort_order = :sort_order";
        
        if ($this->logo !== null) {
            $query .= ", logo = :logo";
        }
        $query .= " WHERE id = :id AND deleted_at IS NULL";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(":name", $this->name);
            $stmt->bindParam(":slug", $this->slug);
            $stmt->bindParam(":description", $this->description);
            $stmt->bindParam(":website", $this->website);
            $stmt->bindParam(":status", $this->status);
            
            $featured = $this->featured ? 1 : 0;
            $stmt->bindParam(":featured", $featured, PDO::PARAM_INT);
            
            if(empty($this->sort_order)) {
                $stmt->bindValue(":sort_order", 0, PDO::PARAM_INT);
            } else {
                $stmt->bindParam(":sort_order", $this->sort_order);
            }
            
            if ($this->logo !== null) {
                $stmt->bindParam(":logo", $this->logo);
            }
            
            $stmt->bindParam(":id", $this->id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Brand update error: " . $e->getMessage());
            return false;
        }
    }

    public function hasProducts($id) {
        $query = "SELECT COUNT(*) as count FROM products WHERE brand_id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['count'] > 0;
    }

    public function delete() {
        $query = "UPDATE " . $this->table_name . " SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $this->id);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Brand delete error: " . $e->getMessage());
            return false;
        }
    }

    public function updateStatus($id, $status) {
        $query = "UPDATE " . $this->table_name . " SET status = :status WHERE id = :id";
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":status", $status);
            $stmt->bindParam(":id", $id);
            return $stmt->execute();
        } catch (PDOException $e) {
            return false;
        }
    }

    public function updateFeatured($id, $featured) {
        $query = "UPDATE " . $this->table_name . " SET featured = :featured WHERE id = :id";
        try {
            $stmt = $this->conn->prepare($query);
            $featuredInt = $featured ? 1 : 0;
            $stmt->bindParam(":featured", $featuredInt, PDO::PARAM_INT);
            $stmt->bindParam(":id", $id);
            return $stmt->execute();
        } catch (PDOException $e) {
            return false;
        }
    }
}
