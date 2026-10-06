<?php
// backend/models/Product.php

class Product {
    private $conn;
    private $table_name = "products";

    public $id;
    public $medicine_group_id;
    public $category_id;
    public $subcategory_id;
    public $brand_id;
    public $name;
    public $slug;
    public $sku;
    public $description;
    public $short_description;
    public $price;
    public $sale_price;
    public $stock_quantity;
    public $image;
    public $status;
    public $prescription_required;
    public $featured;
    public $bestseller;
    public $new_launch;
    public $ingredients;
    public $usage_instructions;
    public $warnings;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function filterProducts($params = []) {
        $search = isset($params['search']) ? trim($params['search']) : '';
        $categories = $params['categories'] ?? $params['category'] ?? [];
        $brands = $params['brands'] ?? $params['brand'] ?? [];
        $priceRanges = $params['price'] ?? [];
        $minPrice = isset($params['min_price']) && is_numeric($params['min_price']) ? (float)$params['min_price'] : null;
        $maxPrice = isset($params['max_price']) && is_numeric($params['max_price']) ? (float)$params['max_price'] : null;
        $rating = isset($params['rating']) && is_numeric($params['rating']) ? (float)$params['rating'] : null;
        $sort = isset($params['sort']) ? trim($params['sort']) : 'featured';
        $page = isset($params['page']) ? max(1, (int)$params['page']) : 1;
        $limit = isset($params['limit']) ? max(1, min(100, (int)$params['limit'])) : 12;
        $offset = ($page - 1) * $limit;

        if (is_string($categories)) {
            $categories = array_filter(array_map('trim', explode(',', $categories)));
        }
        if (is_string($brands)) {
            $brands = array_filter(array_map('trim', explode(',', $brands)));
        }
        if (is_string($priceRanges)) {
            $priceRanges = array_filter(array_map('trim', explode(',', $priceRanges)));
        }

        $effectivePriceExpr = "(CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 AND p.sale_price < p.price THEN p.sale_price ELSE p.price END)";
        $whereConditions = ["p.status = 'ACTIVE'"];
        $bindings = [];

        // Categories filter
        if (!empty($categories)) {
            $catPlaceholders = [];
            foreach (array_values($categories) as $idx => $catVal) {
                $ph = ":cat_" . $idx;
                $catPlaceholders[] = $ph;
                $bindings[$ph] = $catVal;
            }
            $catIn = implode(',', $catPlaceholders);
            $whereConditions[] = "(
                c.slug IN ($catIn) 
                OR p.category_id IN ($catIn) 
                OR sc.slug IN ($catIn) 
                OR p.subcategory_id IN ($catIn) 
                OR mg.slug IN ($catIn) 
                OR p.medicine_group_id IN ($catIn) 
                OR c.parent_id IN (SELECT id FROM categories WHERE slug IN ($catIn) OR id IN ($catIn))
            )";
        }

        // Brands filter
        if (!empty($brands)) {
            $brandPlaceholders = [];
            foreach (array_values($brands) as $idx => $brandVal) {
                $ph = ":brand_" . $idx;
                $brandPlaceholders[] = $ph;
                $bindings[$ph] = $brandVal;
            }
            $brandIn = implode(',', $brandPlaceholders);
            $whereConditions[] = "(p.brand_id IN ($brandIn) OR b.slug IN ($brandIn))";
        }

        // Price filter: ranges (OR within group)
        if (!empty($priceRanges)) {
            $rangeClauses = [];
            foreach ($priceRanges as $pr) {
                $pr = strtolower(trim($pr));
                if ($pr === 'under-500' || $pr === 'under_500' || $pr === '<500') {
                    $rangeClauses[] = "$effectivePriceExpr < 500";
                } elseif ($pr === '500-1000' || $pr === '500_1000') {
                    $rangeClauses[] = "($effectivePriceExpr >= 500 AND $effectivePriceExpr <= 1000)";
                } elseif ($pr === '1000-5000' || $pr === '1000_5000') {
                    $rangeClauses[] = "($effectivePriceExpr >= 1000 AND $effectivePriceExpr <= 5000)";
                } elseif ($pr === 'over-5000' || $pr === 'over_5000' || $pr === '>5000') {
                    $rangeClauses[] = "$effectivePriceExpr > 5000";
                }
            }
            if (!empty($rangeClauses)) {
                $whereConditions[] = "(" . implode(' OR ', $rangeClauses) . ")";
            }
        }

        // Direct min_price / max_price if provided
        if ($minPrice !== null) {
            $whereConditions[] = "$effectivePriceExpr >= :min_price";
            $bindings[':min_price'] = $minPrice;
        }
        if ($maxPrice !== null) {
            $whereConditions[] = "$effectivePriceExpr <= :max_price";
            $bindings[':max_price'] = $maxPrice;
        }

        // Search filter
        if (!empty($search)) {
            $whereConditions[] = "(p.name LIKE :search OR p.description LIKE :search OR p.short_description LIKE :search OR p.sku LIKE :search OR b.name LIKE :search OR c.name LIKE :search)";
            $bindings[':search'] = '%' . $search . '%';
        }

        // New Launch filter
        if (isset($params['new_launch']) && ($params['new_launch'] === '1' || $params['new_launch'] === 1 || $params['new_launch'] === 'true')) {
            $whereConditions[] = "p.new_launch = 1";
        }

        // Special Deals filter (products with active sale discount)
        if (isset($params['deals']) && ($params['deals'] === '1' || $params['deals'] === 1 || $params['deals'] === 'true')) {
            $whereConditions[] = "(p.sale_price IS NOT NULL AND p.sale_price > 0 AND p.sale_price < p.price)";
        }

        // Featured filter
        if (isset($params['featured']) && ($params['featured'] === '1' || $params['featured'] === 1 || $params['featured'] === 'true')) {
            $whereConditions[] = "p.featured = 1";
        }

        // Rating filter (HAVING clause)
        $havingConditions = [];
        if ($rating !== null && $rating > 0) {
            $havingConditions[] = "AVG(r.rating) >= :min_rating";
            $bindings[':min_rating'] = $rating;
        }

        // Sorting
        switch ($sort) {
            case 'popularity':
                $orderBy = "p.bestseller DESC, review_count DESC, avg_rating DESC, p.id DESC";
                break;
            case 'latest':
            case 'newest':
                $orderBy = "p.created_at DESC, p.id DESC";
                break;
            case 'price-low':
            case 'price_asc':
                $orderBy = "$effectivePriceExpr ASC, p.id ASC";
                break;
            case 'price-high':
            case 'price_desc':
                $orderBy = "$effectivePriceExpr DESC, p.id DESC";
                break;
            case 'rating':
                $orderBy = "avg_rating DESC, review_count DESC, p.id DESC";
                break;
            case 'name-asc':
            case 'name_asc':
            case 'name':
                $orderBy = "p.name ASC";
                break;
            case 'name-desc':
            case 'name_desc':
                $orderBy = "p.name DESC";
                break;
            case 'featured':
            default:
                $orderBy = "p.featured DESC, p.id DESC";
                break;
        }

        $whereSql = implode(' AND ', $whereConditions);
        $havingSql = !empty($havingConditions) ? " HAVING " . implode(' AND ', $havingConditions) : "";

        // 1. Total Count query
        $countQuery = "SELECT COUNT(*) as total FROM (
            SELECT p.id 
            FROM " . $this->table_name . " p
            LEFT JOIN categories mg ON p.medicine_group_id = mg.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.subcategory_id = sc.id
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'APPROVED'
            WHERE $whereSql
            GROUP BY p.id
            $havingSql
        ) as count_table";

        $countStmt = $this->conn->prepare($countQuery);
        foreach ($bindings as $key => $val) {
            $countStmt->bindValue($key, $val);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        // 2. Data query
        $dataQuery = "SELECT 
            p.*,
            mg.name as medicine_group_name,
            c.name as category_name,
            c.slug as category_slug,
            sc.name as subcategory_name,
            sc.slug as subcategory_slug,
            b.name as brand_name,
            b.slug as brand_slug,
            $effectivePriceExpr AS effective_price,
            ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
            COUNT(r.id) AS review_count
        FROM " . $this->table_name . " p
        LEFT JOIN categories mg ON p.medicine_group_id = mg.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sc ON p.subcategory_id = sc.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'APPROVED'
        WHERE $whereSql
        GROUP BY p.id
        $havingSql
        ORDER BY $orderBy
        LIMIT :limit OFFSET :offset";

        $dataStmt = $this->conn->prepare($dataQuery);
        foreach ($bindings as $key => $val) {
            $dataStmt->bindValue($key, $val);
        }
        $dataStmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $dataStmt->execute();

        $products = [];
        while ($row = $dataStmt->fetch(PDO::FETCH_ASSOC)) {
            $row['price'] = (float)$row['price'];
            $row['sale_price'] = $row['sale_price'] !== null ? (float)$row['sale_price'] : null;
            $row['effective_price'] = (float)$row['effective_price'];
            $row['stock_quantity'] = (int)$row['stock_quantity'];
            $row['rating'] = (float)$row['avg_rating'];
            $row['reviews'] = (int)$row['review_count'];
            $products[] = $row;
        }

        return [
            'products' => $products,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => $limit > 0 ? (int)ceil($total / $limit) : 1
            ]
        ];
    }

    public function readAll($limit = 100, $categorySlug = null) {
        $params = [
            'limit' => $limit,
            'category' => $categorySlug
        ];
        $result = $this->filterProducts($params);
        return $result['products'];
    }

    public function readAllAdmin() {
        $query = "SELECT p.*, mg.name as medicine_group_name, c.name as category_name, sc.name as subcategory_name, b.name as brand_name 
                  FROM " . $this->table_name . " p
                  LEFT JOIN categories mg ON p.medicine_group_id = mg.id
                  LEFT JOIN categories c ON p.category_id = c.id
                  LEFT JOIN categories sc ON p.subcategory_id = sc.id
                  LEFT JOIN brands b ON p.brand_id = b.id
                  ORDER BY p.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function readOne($id) {
        $query = "SELECT p.*, mg.name as medicine_group_name, c.name as category_name, sc.name as subcategory_name, b.name as brand_name 
                  FROM " . $this->table_name . " p
                  LEFT JOIN categories mg ON p.medicine_group_id = mg.id
                  LEFT JOIN categories c ON p.category_id = c.id
                  LEFT JOIN categories sc ON p.subcategory_id = sc.id
                  LEFT JOIN brands b ON p.brand_id = b.id
                  WHERE p.id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  (medicine_group_id, category_id, subcategory_id, brand_id, name, slug, sku, description, short_description, price, sale_price, stock_quantity, image, status, prescription_required, featured, bestseller, new_launch, ingredients, usage_instructions, warnings) 
                  VALUES (:medicine_group_id, :category_id, :subcategory_id, :brand_id, :name, :slug, :sku, :description, :short_description, :price, :sale_price, :stock_quantity, :image, :status, :prescription_required, :featured, :bestseller, :new_launch, :ingredients, :usage_instructions, :warnings)";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize and Bind
        $stmt->bindValue(":medicine_group_id", empty($this->medicine_group_id) ? null : $this->medicine_group_id, empty($this->medicine_group_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":category_id", empty($this->category_id) ? null : $this->category_id, empty($this->category_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":subcategory_id", empty($this->subcategory_id) ? null : $this->subcategory_id, empty($this->subcategory_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":brand_id", empty($this->brand_id) ? null : $this->brand_id, empty($this->brand_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":slug", $this->slug);
        $stmt->bindParam(":sku", $this->sku);
        $stmt->bindValue(":description", empty($this->description) ? null : $this->description);
        $stmt->bindValue(":short_description", empty($this->short_description) ? null : $this->short_description);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindValue(":sale_price", empty($this->sale_price) ? null : $this->sale_price);
        $stmt->bindParam(":stock_quantity", $this->stock_quantity);
        $stmt->bindValue(":image", empty($this->image) ? null : $this->image);
        $stmt->bindValue(":status", empty($this->status) ? 'ACTIVE' : $this->status);
        
        $prescription_req = $this->prescription_required ? 1 : 0;
        $stmt->bindParam(":prescription_required", $prescription_req, PDO::PARAM_INT);
        $is_featured = $this->featured ? 1 : 0;
        $stmt->bindParam(":featured", $is_featured, PDO::PARAM_INT);
        $is_bestseller = $this->bestseller ? 1 : 0;
        $stmt->bindParam(":bestseller", $is_bestseller, PDO::PARAM_INT);
        $is_new_launch = $this->new_launch ? 1 : 0;
        $stmt->bindParam(":new_launch", $is_new_launch, PDO::PARAM_INT);
        
        $stmt->bindValue(":ingredients", empty($this->ingredients) ? null : $this->ingredients);
        $stmt->bindValue(":usage_instructions", empty($this->usage_instructions) ? null : $this->usage_instructions);
        $stmt->bindValue(":warnings", empty($this->warnings) ? null : $this->warnings);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . " SET 
                  medicine_group_id = :medicine_group_id,
                  category_id = :category_id,
                  subcategory_id = :subcategory_id,
                  brand_id = :brand_id,
                  name = :name,
                  slug = :slug,
                  sku = :sku,
                  description = :description,
                  short_description = :short_description,
                  price = :price,
                  sale_price = :sale_price,
                  stock_quantity = :stock_quantity,
                  status = :status,
                  prescription_required = :prescription_required,
                  featured = :featured,
                  bestseller = :bestseller,
                  new_launch = :new_launch,
                  ingredients = :ingredients,
                  usage_instructions = :usage_instructions,
                  warnings = :warnings";

        // Update image only if provided
        if (!empty($this->image)) {
            $query .= ", image = :image";
        }
                  
        $query .= " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindValue(":medicine_group_id", empty($this->medicine_group_id) ? null : $this->medicine_group_id, empty($this->medicine_group_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":category_id", empty($this->category_id) ? null : $this->category_id, empty($this->category_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":subcategory_id", empty($this->subcategory_id) ? null : $this->subcategory_id, empty($this->subcategory_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(":brand_id", empty($this->brand_id) ? null : $this->brand_id, empty($this->brand_id) ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":slug", $this->slug);
        $stmt->bindParam(":sku", $this->sku);
        $stmt->bindValue(":description", empty($this->description) ? null : $this->description);
        $stmt->bindValue(":short_description", empty($this->short_description) ? null : $this->short_description);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindValue(":sale_price", empty($this->sale_price) ? null : $this->sale_price);
        $stmt->bindParam(":stock_quantity", $this->stock_quantity);
        $stmt->bindValue(":status", empty($this->status) ? 'ACTIVE' : $this->status);
        
        if (!empty($this->image)) {
            $stmt->bindParam(":image", $this->image);
        }

        $prescription_req = $this->prescription_required ? 1 : 0;
        $stmt->bindParam(":prescription_required", $prescription_req, PDO::PARAM_INT);
        $is_featured = $this->featured ? 1 : 0;
        $stmt->bindParam(":featured", $is_featured, PDO::PARAM_INT);
        $is_bestseller = $this->bestseller ? 1 : 0;
        $stmt->bindParam(":bestseller", $is_bestseller, PDO::PARAM_INT);
        $is_new_launch = $this->new_launch ? 1 : 0;
        $stmt->bindParam(":new_launch", $is_new_launch, PDO::PARAM_INT);
        
        $stmt->bindValue(":ingredients", empty($this->ingredients) ? null : $this->ingredients);
        $stmt->bindValue(":usage_instructions", empty($this->usage_instructions) ? null : $this->usage_instructions);
        $stmt->bindValue(":warnings", empty($this->warnings) ? null : $this->warnings);
        
        $stmt->bindParam(":id", $this->id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>
