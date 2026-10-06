<?php
// backend/models/Category.php

class Category {
    private $conn;
    private $table_name = "categories";

    public $id;
    public $name;
    public $slug;
    public $description;
    public $image;
    public $parent_id;
    public $status;
    public $sort_order;
    public $show_on_homepage;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Existing method used by frontend
    public function readAll() {
        // Return ACTIVE categories with product counts for the customer frontend
        $query = "SELECT c.*, 
                         (SELECT COUNT(*) FROM products WHERE (category_id = c.id OR subcategory_id = c.id OR medicine_group_id = c.id) AND status = 'ACTIVE') as product_count 
                  FROM " . $this->table_name . " c 
                  WHERE c.status = 'ACTIVE' 
                  ORDER BY c.sort_order ASC, c.name ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // New method for Admin Dashboard
    public function readAllAdmin() {
        // Returns all categories, with parent names and product counts
        $query = "
            SELECT 
                c.*, 
                p.name as parent_name,
                (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
            FROM " . $this->table_name . " c
            LEFT JOIN " . $this->table_name . " p ON c.parent_id = p.id
            ORDER BY c.sort_order ASC, c.name ASC
        ";
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            return $stmt;
        } catch (PDOException $e) {
            // Fallback if table doesn't have parent_id or sort_order yet
            $query = "SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count FROM " . $this->table_name . " c ORDER BY c.name ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            return $stmt;
        }
    }

    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getBySlug($slug) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE slug = ? LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $slug);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  (name, slug, description, image, parent_id, status, sort_order, show_on_homepage) 
                  VALUES (:name, :slug, :description, :image, :parent_id, :status, :sort_order, :show_on_homepage)";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(":name", $this->name);
            $stmt->bindParam(":slug", $this->slug);
            $stmt->bindParam(":description", $this->description);
            $stmt->bindParam(":image", $this->image);
            
            if(empty($this->parent_id)) {
                $stmt->bindValue(":parent_id", null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(":parent_id", $this->parent_id);
            }
            
            $stmt->bindParam(":status", $this->status);
            
            if(empty($this->sort_order)) {
                $stmt->bindValue(":sort_order", 0, PDO::PARAM_INT);
            } else {
                $stmt->bindParam(":sort_order", $this->sort_order);
            }
            
            $showOnHome = $this->show_on_homepage ? 1 : 0;
            $stmt->bindParam(":show_on_homepage", $showOnHome, PDO::PARAM_INT);

            if($stmt->execute()) {
                return true;
            }
        } catch (PDOException $e) {
            error_log("Category create error: " . $e->getMessage());
            return false;
        }
        return false;
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . " SET 
                  name = :name, 
                  slug = :slug, 
                  description = :description, 
                  parent_id = :parent_id, 
                  status = :status, 
                  sort_order = :sort_order,
                  show_on_homepage = :show_on_homepage";
        
        if ($this->image !== null) {
            $query .= ", image = :image";
        }
        $query .= " WHERE id = :id";
        
        try {
            $stmt = $this->conn->prepare($query);
            
            $stmt->bindParam(":name", $this->name);
            $stmt->bindParam(":slug", $this->slug);
            $stmt->bindParam(":description", $this->description);
            
            if(empty($this->parent_id)) {
                $stmt->bindValue(":parent_id", null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(":parent_id", $this->parent_id);
            }
            
            $stmt->bindParam(":status", $this->status);
            
            if(empty($this->sort_order)) {
                $stmt->bindValue(":sort_order", 0, PDO::PARAM_INT);
            } else {
                $stmt->bindParam(":sort_order", $this->sort_order);
            }
            
            $showOnHome = $this->show_on_homepage ? 1 : 0;
            $stmt->bindParam(":show_on_homepage", $showOnHome, PDO::PARAM_INT);
            
            if ($this->image !== null) {
                $stmt->bindParam(":image", $this->image);
            }
            
            $stmt->bindParam(":id", $this->id);

            if($stmt->execute()) {
                return true;
            }
        } catch (PDOException $e) {
            error_log("Category update error: " . $e->getMessage());
            return false;
        }
        return false;
    }

    public function hasProducts() {
        $query = "SELECT COUNT(*) as total FROM products WHERE category_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'] > 0;
    }

    public function hasSubcategories() {
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name . " WHERE parent_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total'] > 0;
    }

    public function delete() {
        if ($this->hasProducts()) {
            return false; // Cannot delete if products exist
        }
        if ($this->hasSubcategories()) {
            return false; // Cannot delete if subcategories exist
        }
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        if($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>
