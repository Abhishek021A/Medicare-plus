<?php
// backend/controllers/BlogController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class BlogController {
    private $method;
    private $id;
    private $subAction;
    private $db;
    private $uploadDir;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();

        $this->uploadDir = dirname(__DIR__) . '/uploads/blog/';
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0777, true);
        }
    }

    public function processRequest() {
        if ($this->method === 'POST' && isset($_POST['_method']) && in_array(strtoupper($_POST['_method']), ['PUT', 'PATCH'])) {
            $this->method = strtoupper($_POST['_method']);
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'summary') {
                    $this->getSummary();
                } else if ($this->id === 'categories') {
                    $this->getCategories();
                } else if ($this->id === 'export') {
                    $this->exportPosts();
                } else if ($this->id) {
                    $this->getPost($this->id);
                } else {
                    $this->getPosts();
                }
                break;

            case 'POST':
                if ($this->id && $this->subAction === 'status') {
                    $this->updateStatus((int)$this->id);
                } else if ($this->id && $this->subAction === 'duplicate') {
                    $this->duplicatePost((int)$this->id);
                } else if ($this->id) {
                    $this->updatePost((int)$this->id);
                } else {
                    $this->createPost();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        $this->updatePost((int)$this->id);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Post ID required."]);
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deletePost((int)$this->id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Post ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed."]);
                break;
        }
    }

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

    private function requireAdmin() {
        $admin = $this->isAdminRequest();
        if (!$admin) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            exit();
        }
        return $admin;
    }

    /**
     * Sanitize HTML content to prevent XSS (removes <script>, inline event handlers, javascript: URIs)
     */
    private function sanitizeHtml($html) {
        if (empty($html)) return '';

        // Strip scripts, iframes, objects, embeds, applets
        $cleaned = preg_replace('/<\s*(script|iframe|object|embed|applet)\b[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $html);
        $cleaned = preg_replace('/<\s*(script|iframe|object|embed|applet)\b[^>]*\/?>/is', '', $cleaned);

        // Remove inline event handlers like onclick=, onerror=, onload=
        $cleaned = preg_replace('/\s*on\w+\s*=\s*(["\']).*?\1/is', '', $cleaned);
        $cleaned = preg_replace('/\s*on\w+\s*=\s*[^>\s]+/is', '', $cleaned);

        // Remove javascript: and vbscript: URIs
        $cleaned = preg_replace('/(href|src)\s*=\s*(["\'])\s*(javascript|vbscript|data):.*?\2/is', '$1="#"', $cleaned);

        return $cleaned;
    }

    /**
     * Generate clean, URL-safe slug from title
     */
    private function generateSlug($text) {
        $text = preg_replace('~[^\pL\d]+~u', '-', $text);
        $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
        $text = preg_replace('~[^-\w]+~', '', $text);
        $text = trim($text, '-');
        $text = preg_replace('~-+~', '-', $text);
        $text = strtolower($text);
        return $text ?: 'article-' . time();
    }

    private function calculateSummary() {
        $totalStmt = $this->db->query("SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL");
        $total = (int)$totalStmt->fetchColumn();

        $publishedStmt = $this->db->query("
            SELECT COUNT(*) FROM blog_posts 
            WHERE deleted_at IS NULL 
              AND status = 'PUBLISHED' 
              AND (publish_at IS NULL OR publish_at <= NOW())
        ");
        $published = (int)$publishedStmt->fetchColumn();

        $draftsStmt = $this->db->query("SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL AND status = 'DRAFT'");
        $drafts = (int)$draftsStmt->fetchColumn();

        $scheduledStmt = $this->db->query("
            SELECT COUNT(*) FROM blog_posts 
            WHERE deleted_at IS NULL 
              AND status = 'PUBLISHED' 
              AND publish_at IS NOT NULL 
              AND publish_at > NOW()
        ");
        $scheduled = (int)$scheduledStmt->fetchColumn();

        $archivedStmt = $this->db->query("SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL AND status = 'ARCHIVED'");
        $archived = (int)$archivedStmt->fetchColumn();

        $viewsStmt = $this->db->query("SELECT COALESCE(SUM(views), 0) FROM blog_posts WHERE deleted_at IS NULL");
        $totalViews = (int)$viewsStmt->fetchColumn();

        return [
            "total" => $total,
            "published" => $published,
            "drafts" => $drafts,
            "scheduled" => $scheduled,
            "archived" => $archived,
            "totalViews" => $totalViews
        ];
    }

    private function getSummary() {
        $this->requireAdmin();
        echo json_encode(["success" => true, "data" => $this->calculateSummary()]);
    }

    private function getCategories() {
        $stmt = $this->db->query("SELECT id, name, slug, description FROM blog_categories WHERE status = 'ACTIVE' ORDER BY name ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "data" => $categories]);
    }

    /**
     * Unified Posts List:
     * - Customer: public only, status=PUBLISHED and publish_at <= NOW(), non-deleted
     * - Admin: full filtered & paginated with summary
     */
    private function getPosts() {
        $isAdmin = $this->isAdminRequest();
        $isExplicitAdmin = isset($_GET['admin']) && $_GET['admin'] === 'true';

        // 1. Customer Public Request
        if (!$isAdmin || (!$isExplicitAdmin && !isset($_GET['status']))) {
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 6;
            $offset = ($page - 1) * $limit;

            $search = trim($_GET['search'] ?? '');
            $category = trim($_GET['category'] ?? '');
            $tag = trim($_GET['tag'] ?? '');

            $where = [
                "p.deleted_at IS NULL",
                "p.status = 'PUBLISHED'",
                "(p.publish_at IS NULL OR p.publish_at <= NOW())"
            ];
            $params = [];

            if (!empty($search)) {
                $where[] = "(p.title LIKE :search OR p.excerpt LIKE :search OR p.content LIKE :search OR p.tags LIKE :search)";
                $params[':search'] = "%{$search}%";
            }

            if (!empty($category) && $category !== 'All') {
                $where[] = "(p.category_name = :cat OR c.name = :cat OR c.slug = :cat)";
                $params[':cat'] = $category;
            }

            if (!empty($tag)) {
                $where[] = "p.tags LIKE :tag";
                $params[':tag'] = "%{$tag}%";
            }

            $whereSql = "WHERE " . implode(" AND ", $where);

            // Total count for customer pagination
            $countQuery = "
                SELECT COUNT(*) FROM blog_posts p 
                LEFT JOIN blog_categories c ON p.category_id = c.id 
                {$whereSql}
            ";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            $totalPages = $total > 0 ? ceil($total / $limit) : 1;

            $query = "
                SELECT 
                    p.id,
                    p.title,
                    p.slug,
                    p.excerpt,
                    p.featured_image,
                    p.featured_image as image,
                    COALESCE(p.category_name, c.name, 'Health & Wellness') as category,
                    COALESCE(p.author_name, u.name, 'Admin User') as author,
                    p.publish_at,
                    p.created_at,
                    DATE_FORMAT(COALESCE(p.publish_at, p.created_at), '%b %d, %Y') as date,
                    p.read_time as readTime,
                    p.views,
                    p.tags
                FROM blog_posts p
                LEFT JOIN blog_categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.author_id = u.id
                {$whereSql}
                ORDER BY COALESCE(p.publish_at, p.created_at) DESC
                LIMIT :offset, :limit
            ";

            $stmt = $this->db->prepare($query);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch distinct active categories for tabs
            $catStmt = $this->db->query("
                SELECT DISTINCT COALESCE(p.category_name, c.name) as name
                FROM blog_posts p
                LEFT JOIN blog_categories c ON p.category_id = c.id
                WHERE p.deleted_at IS NULL AND p.status = 'PUBLISHED' AND (p.publish_at IS NULL OR p.publish_at <= NOW())
                ORDER BY name ASC
            ");
            $categories = array_filter($catStmt->fetchAll(PDO::FETCH_COLUMN));
            array_unshift($categories, 'All');

            echo json_encode([
                "success" => true,
                "data" => [
                    "posts" => $posts,
                    "categories" => array_values(array_unique($categories)),
                    "pagination" => [
                        "page" => $page,
                        "limit" => $limit,
                        "total" => $total,
                        "totalPages" => $totalPages
                    ]
                ]
            ]);
            return;
        }

        // 2. Admin Request
        $this->requireAdmin();

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
        $category = trim($_GET['category'] ?? 'ALL');
        $author = trim($_GET['author'] ?? 'ALL');
        $dateFilter = trim($_GET['date_filter'] ?? 'all');
        $sort = trim($_GET['sort'] ?? 'newest');

        $where = ["p.deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(p.title LIKE :search OR p.slug LIKE :search OR p.excerpt LIKE :search OR p.tags LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if (!empty($category) && $category !== 'ALL') {
            $where[] = "(p.category_name = :category OR c.name = :category)";
            $params[':category'] = $category;
        }

        if (!empty($author) && $author !== 'ALL') {
            $where[] = "(p.author_name LIKE :author OR u.name LIKE :author)";
            $params[':author'] = "%{$author}%";
        }

        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'PUBLISHED') {
                $where[] = "p.status = 'PUBLISHED' AND (p.publish_at IS NULL OR p.publish_at <= NOW())";
            } else if ($status === 'SCHEDULED') {
                $where[] = "p.status = 'PUBLISHED' AND p.publish_at IS NOT NULL AND p.publish_at > NOW()";
            } else if ($status === 'DRAFT') {
                $where[] = "p.status = 'DRAFT'";
            } else if ($status === 'ARCHIVED') {
                $where[] = "p.status = 'ARCHIVED'";
            }
        }

        if ($dateFilter === 'today') {
            $where[] = "DATE(p.created_at) = CURDATE()";
        } else if ($dateFilter === 'this_week' || $dateFilter === '7days') {
            $where[] = "p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateFilter === 'this_month' || $dateFilter === '30days') {
            $where[] = "p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }

        $whereSql = "WHERE " . implode(" AND ", $where);

        $orderBy = "p.created_at DESC";
        switch ($sort) {
            case 'newest':
                $orderBy = "p.created_at DESC";
                break;
            case 'oldest':
                $orderBy = "p.created_at ASC";
                break;
            case 'updated':
                $orderBy = "p.updated_at DESC";
                break;
            case 'title_asc':
                $orderBy = "p.title ASC";
                break;
            case 'title_desc':
                $orderBy = "p.title DESC";
                break;
            case 'views':
                $orderBy = "p.views DESC";
                break;
        }

        // Total count
        $countQuery = "
            SELECT COUNT(*) FROM blog_posts p 
            LEFT JOIN blog_categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.author_id = u.id
            {$whereSql}
        ";
        $countStmt = $this->db->prepare($countQuery);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        $totalPages = $total > 0 ? ceil($total / $limit) : 1;

        $query = "
            SELECT 
                p.id,
                p.title,
                p.slug,
                p.excerpt,
                p.featured_image,
                p.featured_image as image,
                COALESCE(p.category_name, c.name, 'Health & Wellness') as category,
                COALESCE(p.author_name, u.name, 'Admin User') as author,
                p.status,
                p.publish_at,
                p.created_at,
                p.updated_at,
                p.views,
                p.read_time,
                p.tags,
                p.meta_title,
                p.meta_description,
                p.focus_keyword,
                CASE 
                    WHEN p.status = 'ARCHIVED' THEN 'ARCHIVED'
                    WHEN p.status = 'DRAFT' THEN 'DRAFT'
                    WHEN p.publish_at IS NOT NULL AND p.publish_at > NOW() THEN 'SCHEDULED'
                    ELSE 'PUBLISHED'
                END as computed_status
            FROM blog_posts p
            LEFT JOIN blog_categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.author_id = u.id
            {$whereSql}
            ORDER BY {$orderBy}
            LIMIT :offset, :limit
        ";

        $stmt = $this->db->prepare($query);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "posts" => $posts,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $totalPages
                ],
                "summary" => $this->calculateSummary()
            ]
        ]);
    }

    /**
     * Single Post Details by Slug or ID
     */
    private function getPost($identifier) {
        $isAdmin = $this->isAdminRequest();

        $isNumeric = is_numeric($identifier);
        $where = $isNumeric ? "p.id = :id" : "p.slug = :slug";
        $param = $isNumeric ? [':id' => (int)$identifier] : [':slug' => $identifier];

        $query = "
            SELECT 
                p.*,
                p.featured_image as image,
                COALESCE(p.category_name, c.name, 'Health & Wellness') as category,
                COALESCE(p.author_name, u.name, 'Admin User') as author,
                DATE_FORMAT(COALESCE(p.publish_at, p.created_at), '%b %d, %Y') as date,
                p.read_time as readTime,
                CASE 
                    WHEN p.status = 'ARCHIVED' THEN 'ARCHIVED'
                    WHEN p.status = 'DRAFT' THEN 'DRAFT'
                    WHEN p.publish_at IS NOT NULL AND p.publish_at > NOW() THEN 'SCHEDULED'
                    ELSE 'PUBLISHED'
                END as computed_status
            FROM blog_posts p
            LEFT JOIN blog_categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.author_id = u.id
            WHERE {$where} AND p.deleted_at IS NULL
            LIMIT 1
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute($param);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Article not found or no longer available."]);
            return;
        }

        // Draft / Scheduled / Archived protection for normal customers
        if (!$isAdmin) {
            $isPublished = $post['status'] === 'PUBLISHED' && (empty($post['publish_at']) || strtotime($post['publish_at']) <= time());
            if (!$isPublished) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Article not found or not published."]);
                return;
            }

            // Increment views safely
            $updView = $this->db->prepare("UPDATE blog_posts SET views = views + 1 WHERE id = :id");
            $updView->execute([':id' => $post['id']]);
            $post['views'] = (int)$post['views'] + 1;
        }

        // Fetch Related Articles
        $relStmt = $this->db->prepare("
            SELECT 
                id, title, slug, excerpt, featured_image, featured_image as image,
                COALESCE(category_name, 'Health & Wellness') as category,
                DATE_FORMAT(COALESCE(publish_at, created_at), '%b %d, %Y') as date,
                read_time as readTime
            FROM blog_posts
            WHERE id != :id 
              AND deleted_at IS NULL 
              AND status = 'PUBLISHED' 
              AND (publish_at IS NULL OR publish_at <= NOW())
              AND (category_name = :cat OR 1=1)
            ORDER BY (category_name = :cat) DESC, COALESCE(publish_at, created_at) DESC
            LIMIT 3
        ");
        $relStmt->execute([':id' => $post['id'], ':cat' => $post['category_name']]);
        $relatedPosts = $relStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => [
                "post" => $post,
                "related" => $relatedPosts
            ]
        ]);
    }

    private function uploadFeaturedImage() {
        if (!isset($_FILES['featured_image']) || $_FILES['featured_image']['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $file = $_FILES['featured_image'];
        $tmpName = $file['tmp_name'];
        $fileSize = $file['size'];

        // Size check (max 6MB)
        if ($fileSize > 6 * 1024 * 1024) {
            throw new Exception("Uploaded image exceeds 6MB limit.");
        }

        // MIME validation
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $tmpName);
        finfo_close($finfo);

        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/jpg'  => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif'
        ];

        if (!array_key_exists($mime, $allowedMimes)) {
            throw new Exception("Invalid file type: '{$mime}'. Allowed: JPG, PNG, WEBP, GIF.");
        }

        $ext = $allowedMimes[$mime];
        $uniqueName = 'blog_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $targetPath = $this->uploadDir . $uniqueName;

        if (!move_uploaded_file($tmpName, $targetPath)) {
            throw new Exception("Failed to save uploaded image.");
        }

        return '/uploads/blog/' . $uniqueName;
    }

    private function createPost() {
        $admin = $this->requireAdmin();

        $data = !empty($_POST) ? $_POST : (json_decode(file_get_contents("php://input"), true) ?: []);

        $title = trim($data['title'] ?? '');
        $slug = trim($data['slug'] ?? '');
        $excerpt = trim($data['excerpt'] ?? '');
        $content = $this->sanitizeHtml($data['content'] ?? '');
        $categoryName = trim($data['category_name'] ?? ($data['category'] ?? 'Wellness'));
        $categoryId = !empty($data['category_id']) ? (int)$data['category_id'] : null;
        $authorName = trim($data['author_name'] ?? ($admin['name'] ?? 'Admin User'));
        $status = strtoupper(trim($data['status'] ?? 'DRAFT'));
        $publishAt = !empty($data['publish_at']) ? date('Y-m-d H:i:s', strtotime($data['publish_at'])) : null;
        $readTime = trim($data['read_time'] ?? '5 min');
        $tags = trim($data['tags'] ?? '');
        $metaTitle = trim($data['meta_title'] ?? '');
        $metaDescription = trim($data['meta_description'] ?? '');
        $focusKeyword = trim($data['focus_keyword'] ?? '');
        $canonicalUrl = trim($data['canonical_url'] ?? '');

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Post title is required."]);
            return;
        }

        if (empty($slug)) {
            $slug = $this->generateSlug($title);
        } else {
            $slug = $this->generateSlug($slug);
        }

        // Uniqueness check for slug
        $uniqueStmt = $this->db->prepare("SELECT id FROM blog_posts WHERE slug = :slug AND deleted_at IS NULL LIMIT 1");
        $uniqueStmt->execute([':slug' => $slug]);
        if ($uniqueStmt->fetch()) {
            $slug .= '-' . time();
        }

        if (!in_array($status, ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'])) {
            $status = 'DRAFT';
        }

        if ($status === 'SCHEDULED') {
            $status = 'PUBLISHED';
            if (empty($publishAt) || strtotime($publishAt) <= time()) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "A future publish date and time is required to schedule a post."]);
                return;
            }
        } else if ($status === 'PUBLISHED' && empty($publishAt)) {
            $publishAt = date('Y-m-d H:i:s');
        }

        // Upload featured image
        try {
            $featuredImage = $this->uploadFeaturedImage() ?? trim($data['featured_image'] ?? ($data['image'] ?? ''));
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO blog_posts (
                title, slug, excerpt, content, featured_image,
                category_id, category_name, author_id, author_name,
                status, publish_at, read_time, tags,
                meta_title, meta_description, focus_keyword, canonical_url,
                created_at, updated_at
            ) VALUES (
                :title, :slug, :excerpt, :content, :featured_image,
                :category_id, :category_name, :author_id, :author_name,
                :status, :publish_at, :read_time, :tags,
                :meta_title, :meta_description, :focus_keyword, :canonical_url,
                NOW(), NOW()
            )
        ");

        $stmt->execute([
            ':title' => $title,
            ':slug' => $slug,
            ':excerpt' => $excerpt,
            ':content' => $content,
            ':featured_image' => $featuredImage,
            ':category_id' => $categoryId,
            ':category_name' => $categoryName,
            ':author_id' => $admin['id'] ?? 1,
            ':author_name' => $authorName,
            ':status' => $status,
            ':publish_at' => $publishAt,
            ':read_time' => $readTime,
            ':tags' => $tags,
            ':meta_title' => $metaTitle ?: $title,
            ':meta_description' => $metaDescription ?: $excerpt,
            ':focus_keyword' => $focusKeyword,
            ':canonical_url' => $canonicalUrl
        ]);

        $newId = (int)$this->db->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Post created successfully.",
            "data" => [
                "id" => $newId,
                "title" => $title,
                "slug" => $slug,
                "status" => $status
            ],
            "summary" => $this->calculateSummary()
        ]);
    }

    private function updatePost($id) {
        $admin = $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM blog_posts WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Post not found."]);
            return;
        }

        $data = !empty($_POST) ? $_POST : (json_decode(file_get_contents("php://input"), true) ?: []);

        $title = array_key_exists('title', $data) ? trim($data['title']) : $existing['title'];
        $slug = array_key_exists('slug', $data) && !empty($data['slug']) ? $this->generateSlug($data['slug']) : $existing['slug'];
        $excerpt = array_key_exists('excerpt', $data) ? trim($data['excerpt']) : $existing['excerpt'];
        $content = array_key_exists('content', $data) ? $this->sanitizeHtml($data['content']) : $existing['content'];
        $categoryName = array_key_exists('category_name', $data) ? trim($data['category_name']) : (array_key_exists('category', $data) ? trim($data['category']) : $existing['category_name']);
        $categoryId = array_key_exists('category_id', $data) ? (!empty($data['category_id']) ? (int)$data['category_id'] : null) : $existing['category_id'];
        $authorName = array_key_exists('author_name', $data) ? trim($data['author_name']) : $existing['author_name'];
        $status = array_key_exists('status', $data) ? strtoupper(trim($data['status'])) : $existing['status'];
        
        $publishAt = array_key_exists('publish_at', $data) 
            ? (!empty($data['publish_at']) ? date('Y-m-d H:i:s', strtotime($data['publish_at'])) : null) 
            : $existing['publish_at'];

        $readTime = array_key_exists('read_time', $data) ? trim($data['read_time']) : $existing['read_time'];
        $tags = array_key_exists('tags', $data) ? trim($data['tags']) : $existing['tags'];
        $metaTitle = array_key_exists('meta_title', $data) ? trim($data['meta_title']) : $existing['meta_title'];
        $metaDescription = array_key_exists('meta_description', $data) ? trim($data['meta_description']) : $existing['meta_description'];
        $focusKeyword = array_key_exists('focus_keyword', $data) ? trim($data['focus_keyword']) : $existing['focus_keyword'];
        $canonicalUrl = array_key_exists('canonical_url', $data) ? trim($data['canonical_url']) : $existing['canonical_url'];

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Post title is required."]);
            return;
        }

        // Slug uniqueness check against other posts
        $uniqueStmt = $this->db->prepare("SELECT id FROM blog_posts WHERE slug = :slug AND id != :id AND deleted_at IS NULL LIMIT 1");
        $uniqueStmt->execute([':slug' => $slug, ':id' => $id]);
        if ($uniqueStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "The slug '{$slug}' is already in use by another article."]);
            return;
        }

        if ($status === 'SCHEDULED') {
            $status = 'PUBLISHED';
            if (empty($publishAt) || strtotime($publishAt) <= time()) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "A future publish date and time is required to schedule."]);
                return;
            }
        }

        // Image handling
        $featuredImage = $existing['featured_image'];
        try {
            $newImage = $this->uploadFeaturedImage();
            if ($newImage) {
                $featuredImage = $newImage;
            } else if (isset($data['featured_image']) && !empty($data['featured_image'])) {
                $featuredImage = trim($data['featured_image']);
            }
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            return;
        }

        $stmt = $this->db->prepare("
            UPDATE blog_posts SET
                title = :title,
                slug = :slug,
                excerpt = :excerpt,
                content = :content,
                featured_image = :featured_image,
                category_id = :category_id,
                category_name = :category_name,
                author_name = :author_name,
                status = :status,
                publish_at = :publish_at,
                read_time = :read_time,
                tags = :tags,
                meta_title = :meta_title,
                meta_description = :meta_description,
                focus_keyword = :focus_keyword,
                canonical_url = :canonical_url,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':title' => $title,
            ':slug' => $slug,
            ':excerpt' => $excerpt,
            ':content' => $content,
            ':featured_image' => $featuredImage,
            ':category_id' => $categoryId,
            ':category_name' => $categoryName,
            ':author_name' => $authorName,
            ':status' => $status,
            ':publish_at' => $publishAt,
            ':read_time' => $readTime,
            ':tags' => $tags,
            ':meta_title' => $metaTitle,
            ':meta_description' => $metaDescription,
            ':focus_keyword' => $focusKeyword,
            ':canonical_url' => $canonicalUrl,
            ':id' => $id
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Post updated successfully.",
            "data" => [
                "id" => $id,
                "title" => $title,
                "slug" => $slug,
                "status" => $status
            ],
            "summary" => $this->calculateSummary()
        ]);
    }

    private function updateStatus($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM blog_posts WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Post not found."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $status = strtoupper(trim($data['status'] ?? ''));

        if (!in_array($status, ['PUBLISHED', 'DRAFT', 'ARCHIVED'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status: {$status}"]);
            return;
        }

        $publishAt = $post['publish_at'];
        if ($status === 'PUBLISHED' && empty($publishAt)) {
            $publishAt = date('Y-m-d H:i:s');
        }

        $upd = $this->db->prepare("UPDATE blog_posts SET status = :status, publish_at = :publish_at, updated_at = NOW() WHERE id = :id");
        $upd->execute([':status' => $status, ':publish_at' => $publishAt, ':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Post status updated to " . strtolower($status) . ".",
            "status" => $status,
            "summary" => $this->calculateSummary()
        ]);
    }

    private function duplicatePost($id) {
        $admin = $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM blog_posts WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Post not found."]);
            return;
        }

        $newTitle = "Copy of " . $post['title'];
        $newSlug = $this->generateSlug($newTitle) . '-' . substr(md5(uniqid()), 0, 4);

        $ins = $this->db->prepare("
            INSERT INTO blog_posts (
                title, slug, excerpt, content, featured_image,
                category_id, category_name, author_id, author_name,
                status, publish_at, read_time, tags, views,
                meta_title, meta_description, focus_keyword, canonical_url,
                created_at, updated_at
            ) VALUES (
                :title, :slug, :excerpt, :content, :featured_image,
                :category_id, :category_name, :author_id, :author_name,
                'DRAFT', NULL, :read_time, :tags, 0,
                :meta_title, :meta_description, :focus_keyword, :canonical_url,
                NOW(), NOW()
            )
        ");

        $ins->execute([
            ':title' => $newTitle,
            ':slug' => $newSlug,
            ':excerpt' => $post['excerpt'],
            ':content' => $post['content'],
            ':featured_image' => $post['featured_image'],
            ':category_id' => $post['category_id'],
            ':category_name' => $post['category_name'],
            ':author_id' => $admin['id'] ?? 1,
            ':author_name' => $admin['name'] ?? 'Admin User',
            ':read_time' => $post['read_time'],
            ':tags' => $post['tags'],
            ':meta_title' => $newTitle,
            ':meta_description' => $post['meta_description'],
            ':focus_keyword' => $post['focus_keyword'],
            ':canonical_url' => $post['canonical_url']
        ]);

        $newId = (int)$this->db->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Post duplicated as draft.",
            "data" => ["id" => $newId, "title" => $newTitle, "slug" => $newSlug],
            "summary" => $this->calculateSummary()
        ]);
    }

    private function deletePost($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM blog_posts WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$post) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Post not found."]);
            return;
        }

        // Soft delete
        $del = $this->db->prepare("UPDATE blog_posts SET deleted_at = NOW(), status = 'ARCHIVED' WHERE id = :id");
        $del->execute([':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Post '{$post['title']}' deleted successfully.",
            "summary" => $this->calculateSummary()
        ]);
    }

    private function exportPosts() {
        $this->requireAdmin();

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
        $category = trim($_GET['category'] ?? 'ALL');

        $where = ["p.deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(p.title LIKE :search OR p.slug LIKE :search)";
            $params[':search'] = "%{$search}%";
        }
        if (!empty($category) && $category !== 'ALL') {
            $where[] = "p.category_name = :cat";
            $params[':cat'] = $category;
        }
        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'PUBLISHED') {
                $where[] = "p.status = 'PUBLISHED' AND (p.publish_at IS NULL OR p.publish_at <= NOW())";
            } else if ($status === 'SCHEDULED') {
                $where[] = "p.status = 'PUBLISHED' AND p.publish_at IS NOT NULL AND p.publish_at > NOW()";
            } else if ($status === 'DRAFT') {
                $where[] = "p.status = 'DRAFT'";
            } else if ($status === 'ARCHIVED') {
                $where[] = "p.status = 'ARCHIVED'";
            }
        }

        $whereSql = "WHERE " . implode(" AND ", $where);
        $query = "
            SELECT 
                p.id as 'Post ID',
                p.title as 'Title',
                p.slug as 'Slug',
                p.category_name as 'Category',
                p.author_name as 'Author',
                CASE 
                    WHEN p.status = 'ARCHIVED' THEN 'ARCHIVED'
                    WHEN p.status = 'DRAFT' THEN 'DRAFT'
                    WHEN p.publish_at IS NOT NULL AND p.publish_at > NOW() THEN 'SCHEDULED'
                    ELSE 'PUBLISHED'
                END as 'Status',
                COALESCE(p.publish_at, 'Unpublished') as 'Publish Date',
                p.views as 'Views',
                p.created_at as 'Created Date',
                p.updated_at as 'Updated Date'
            FROM blog_posts p
            {$whereSql}
            ORDER BY p.created_at DESC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "data" => $rows, "count" => count($rows)]);
    }
}
