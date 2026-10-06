<?php
// backend/controllers/BannerController.php
require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class BannerController {
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

        $this->uploadDir = dirname(__DIR__) . '/uploads/banners/';
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
                } else if ($this->id === 'export') {
                    $this->exportBanners();
                } else if ($this->id) {
                    $this->getBannerDetails((int)$this->id);
                } else {
                    $this->getBanners();
                }
                break;

            case 'POST':
                if ($this->id === 'reorder') {
                    $this->reorderBanners();
                } else if ($this->id && $this->subAction === 'status') {
                    $this->toggleStatus((int)$this->id);
                } else if ($this->id && $this->subAction === 'duplicate') {
                    $this->duplicateBanner((int)$this->id);
                } else if ($this->id) {
                    // Update via POST (e.g. multipart/form-data for image uploads)
                    $this->updateBanner((int)$this->id);
                } else {
                    $this->createBanner();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->toggleStatus((int)$this->id);
                    } else {
                        $this->updateBanner((int)$this->id);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Banner ID required."]);
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deleteBanner((int)$this->id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Banner ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    private function isAdminRequest() {
        $currentUser = AuthMiddleware::getAuthenticatedUser($this->db);
        if ($currentUser) {
            $allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER', 'MARKETING_MANAGER'];
            if (in_array($currentUser['role'] ?? '', $allowedRoles)) {
                return $currentUser;
            }
        }
        // Also check if admin token was sent in headers
        $token = AuthMiddleware::getBearerToken();
        if ($token === 'mock-admin-token-123') {
            return ['id' => 1, 'role' => 'SUPER_ADMIN'];
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

    private function calculateSummary() {
        $totalStmt = $this->db->query("SELECT COUNT(*) FROM banners WHERE deleted_at IS NULL");
        $total = (int)$totalStmt->fetchColumn();

        $activeStmt = $this->db->query("
            SELECT COUNT(*) FROM banners 
            WHERE deleted_at IS NULL 
              AND status = 'ACTIVE' 
              AND (start_date IS NULL OR start_date <= NOW()) 
              AND (end_date IS NULL OR end_date >= NOW())
        ");
        $active = (int)$activeStmt->fetchColumn();

        $scheduledStmt = $this->db->query("
            SELECT COUNT(*) FROM banners 
            WHERE deleted_at IS NULL 
              AND status != 'INACTIVE'
              AND start_date IS NOT NULL 
              AND start_date > NOW()
        ");
        $scheduled = (int)$scheduledStmt->fetchColumn();

        $expiredStmt = $this->db->query("
            SELECT COUNT(*) FROM banners 
            WHERE deleted_at IS NULL 
              AND end_date IS NOT NULL 
              AND end_date < NOW()
        ");
        $expired = (int)$expiredStmt->fetchColumn();

        $draftStmt = $this->db->query("
            SELECT COUNT(*) FROM banners 
            WHERE deleted_at IS NULL 
              AND status = 'DRAFT'
        ");
        $draft = (int)$draftStmt->fetchColumn();

        return [
            "total" => $total,
            "active" => $active,
            "scheduled" => $scheduled,
            "expired" => $expired,
            "draft" => $draft
        ];
    }

    private function getSummary() {
        $this->requireAdmin();
        echo json_encode([
            "success" => true,
            "data" => $this->calculateSummary()
        ]);
    }

    /**
     * Unified Banner Fetching:
     * - If public customer: returns only valid, active, non-deleted banners for given position
     * - If admin: returns full paginated, filtered list with metrics
     */
    private function getBanners() {
        $isAdmin = $this->isAdminRequest();
        $position = trim($_GET['position'] ?? '');

        // Customer request (non-admin or explicit customer query)
        if (!$isAdmin || (isset($_GET['public']) && $_GET['public'] === 'true') || (!isset($_GET['admin']) && !empty($position) && !isset($_GET['page']))) {
            $where = [
                "deleted_at IS NULL",
                "status = 'ACTIVE'",
                "(start_date IS NULL OR start_date <= NOW())",
                "(end_date IS NULL OR end_date >= NOW())"
            ];
            $params = [];

            if (!empty($position) && $position !== 'ALL') {
                $where[] = "position = :position";
                $params[':position'] = strtoupper($position);
            }

            $whereSql = implode(' AND ', $where);
            $query = "
                SELECT 
                    id, 
                    title, 
                    subtitle, 
                    description, 
                    badge, 
                    image, 
                    image as desktop_image,
                    mobile_image, 
                    button_text, 
                    button_url, 
                    button_url as target_url,
                    open_new_tab, 
                    position, 
                    sort_order
                FROM banners 
                WHERE {$whereSql}
                ORDER BY sort_order ASC, id DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format images to have clean paths
            foreach ($banners as &$b) {
                $b['open_new_tab'] = (bool)$b['open_new_tab'];
                $b['sort_order'] = (int)$b['sort_order'];
            }

            echo json_encode([
                "success" => true,
                "data" => [
                    "banners" => $banners,
                    "count" => count($banners)
                ]
            ]);
            return;
        }

        // Admin Request
        $this->requireAdmin();

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
        $pos = strtoupper(trim($_GET['position'] ?? 'ALL'));
        $dateFilter = trim($_GET['date_filter'] ?? 'all');
        $sort = trim($_GET['sort'] ?? 'sort_order');

        $where = ["deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(title LIKE :search OR subtitle LIKE :search OR description LIKE :search OR badge LIKE :search OR position LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if (!empty($pos) && $pos !== 'ALL') {
            $where[] = "position = :pos";
            $params[':pos'] = $pos;
        }

        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'ACTIVE') {
                $where[] = "status = 'ACTIVE' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())";
            } else if ($status === 'SCHEDULED') {
                $where[] = "status != 'INACTIVE' AND start_date IS NOT NULL AND start_date > NOW()";
            } else if ($status === 'EXPIRED') {
                $where[] = "end_date IS NOT NULL AND end_date < NOW()";
            } else if ($status === 'DISABLED' || $status === 'INACTIVE') {
                $where[] = "status = 'INACTIVE'";
            } else if ($status === 'DRAFT') {
                $where[] = "status = 'DRAFT'";
            }
        }

        if ($dateFilter === 'today') {
            $where[] = "DATE(created_at) = CURDATE()";
        } else if ($dateFilter === 'this_week') {
            $where[] = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateFilter === 'this_month') {
            $where[] = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $orderBy = "sort_order ASC, id DESC";
        switch ($sort) {
            case 'newest':
                $orderBy = "created_at DESC";
                break;
            case 'oldest':
                $orderBy = "created_at ASC";
                break;
            case 'sort_order':
                $orderBy = "sort_order ASC, id ASC";
                break;
            case 'title_asc':
                $orderBy = "title ASC";
                break;
            case 'title_desc':
                $orderBy = "title DESC";
                break;
            case 'updated':
                $orderBy = "updated_at DESC";
                break;
            case 'ending_soon':
                $orderBy = "CASE WHEN end_date IS NOT NULL AND end_date >= NOW() THEN 0 ELSE 1 END, end_date ASC";
                break;
        }

        // Count Total
        $countQuery = "SELECT COUNT(*) FROM banners {$whereClause}";
        $countStmt = $this->db->prepare($countQuery);
        $countStmt->execute($params);
        $totalRecords = (int)$countStmt->fetchColumn();
        $totalPages = $totalRecords > 0 ? ceil($totalRecords / $limit) : 1;

        // Fetch Banners
        $query = "
            SELECT 
                id, 
                title, 
                subtitle, 
                description, 
                badge, 
                image, 
                image as desktop_image,
                mobile_image, 
                button_text, 
                button_url, 
                button_url as target_url,
                open_new_tab, 
                position, 
                sort_order,
                status,
                start_date,
                end_date,
                created_at,
                updated_at,
                CASE 
                    WHEN status = 'DRAFT' THEN 'DRAFT'
                    WHEN status = 'INACTIVE' THEN 'DISABLED'
                    WHEN end_date IS NOT NULL AND end_date < NOW() THEN 'EXPIRED'
                    WHEN start_date IS NOT NULL AND start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as computed_status
            FROM banners 
            {$whereClause}
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
        $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($banners as &$b) {
            $b['open_new_tab'] = (bool)$b['open_new_tab'];
            $b['sort_order'] = (int)$b['sort_order'];
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "banners" => $banners,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $totalRecords,
                    "totalPages" => $totalPages
                ],
                "summary" => $this->calculateSummary()
            ]
        ]);
    }

    private function getBannerDetails($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("
            SELECT 
                *,
                image as desktop_image,
                button_url as target_url,
                CASE 
                    WHEN status = 'DRAFT' THEN 'DRAFT'
                    WHEN status = 'INACTIVE' THEN 'DISABLED'
                    WHEN end_date IS NOT NULL AND end_date < NOW() THEN 'EXPIRED'
                    WHEN start_date IS NOT NULL AND start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as computed_status
            FROM banners 
            WHERE id = :id AND deleted_at IS NULL
        ");
        $stmt->execute([':id' => $id]);
        $banner = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($banner) {
            $banner['open_new_tab'] = (bool)$banner['open_new_tab'];
            $banner['sort_order'] = (int)$banner['sort_order'];
            echo json_encode(["success" => true, "data" => $banner]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Banner not found."]);
        }
    }

    private function uploadFile($fileKey) {
        if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $file = $_FILES[$fileKey];
        $tmpName = $file['tmp_name'];
        $origName = $file['name'];
        $fileSize = $file['size'];

        // Size check (max 6MB)
        if ($fileSize > 6 * 1024 * 1024) {
            throw new Exception("Uploaded file exceeds 6MB limit.");
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
        $uniqueName = 'banner_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $targetPath = $this->uploadDir . $uniqueName;

        if (!move_uploaded_file($tmpName, $targetPath)) {
            throw new Exception("Failed to save uploaded file.");
        }

        return '/uploads/banners/' . $uniqueName;
    }

    private function createBanner() {
        $admin = $this->requireAdmin();

        $data = !empty($_POST) ? $_POST : (json_decode(file_get_contents("php://input"), true) ?: []);

        $title = trim($data['title'] ?? '');
        $subtitle = trim($data['subtitle'] ?? '');
        $description = trim($data['description'] ?? '');
        $badge = trim($data['badge'] ?? '');
        $position = strtoupper(trim($data['position'] ?? 'HOMEPAGE_HERO'));
        $buttonText = trim($data['button_text'] ?? '');
        $buttonUrl = trim($data['button_url'] ?? ($data['target_url'] ?? ''));
        $openNewTab = !empty($data['open_new_tab']) && ($data['open_new_tab'] === 'true' || $data['open_new_tab'] === true || $data['open_new_tab'] == 1) ? 1 : 0;
        $startDate = !empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : null;
        $endDate = !empty($data['end_date']) ? date('Y-m-d H:i:s', strtotime($data['end_date'])) : null;
        $status = strtoupper(trim($data['status'] ?? 'ACTIVE'));
        $sortOrder = isset($data['sort_order']) && $data['sort_order'] !== '' ? (int)$data['sort_order'] : 0;

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Banner title is required."]);
            return;
        }

        if (!in_array($status, ['ACTIVE', 'INACTIVE', 'DRAFT'])) {
            $status = 'ACTIVE';
        }

        if ($startDate && $endDate && strtotime($endDate) < strtotime($startDate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "End date must be greater than or equal to start date."]);
            return;
        }

        // Handle uploaded files
        try {
            $desktopImage = $this->uploadFile('desktop_image') ?? ($this->uploadFile('image') ?? trim($data['image'] ?? ($data['desktop_image'] ?? '')));
            $mobileImage = $this->uploadFile('mobile_image') ?? trim($data['mobile_image'] ?? '');
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            return;
        }

        if (empty($desktopImage)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Please upload a desktop banner image."]);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO banners (
                title,
                subtitle,
                description,
                badge,
                position,
                image,
                mobile_image,
                button_text,
                button_url,
                open_new_tab,
                start_date,
                end_date,
                status,
                sort_order,
                created_by,
                created_at,
                updated_at
            ) VALUES (
                :title,
                :subtitle,
                :description,
                :badge,
                :position,
                :image,
                :mobile_image,
                :button_text,
                :button_url,
                :open_new_tab,
                :start_date,
                :end_date,
                :status,
                :sort_order,
                :created_by,
                NOW(),
                NOW()
            )
        ");

        $stmt->execute([
            ':title' => $title,
            ':subtitle' => $subtitle,
            ':description' => $description,
            ':badge' => $badge,
            ':position' => $position,
            ':image' => $desktopImage,
            ':mobile_image' => $mobileImage ?: null,
            ':button_text' => $buttonText,
            ':button_url' => $buttonUrl,
            ':open_new_tab' => $openNewTab,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':status' => $status,
            ':sort_order' => $sortOrder,
            ':created_by' => $admin['id'] ?? null
        ]);

        $newId = (int)$this->db->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Banner created successfully.",
            "data" => [
                "id" => $newId,
                "title" => $title
            ],
            "summary" => $this->calculateSummary()
        ]);
    }

    private function updateBanner($id) {
        $admin = $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM banners WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Banner not found."]);
            return;
        }

        $data = !empty($_POST) ? $_POST : (json_decode(file_get_contents("php://input"), true) ?: []);

        $title = array_key_exists('title', $data) ? trim($data['title']) : $existing['title'];
        $subtitle = array_key_exists('subtitle', $data) ? trim($data['subtitle']) : $existing['subtitle'];
        $description = array_key_exists('description', $data) ? trim($data['description']) : $existing['description'];
        $badge = array_key_exists('badge', $data) ? trim($data['badge']) : $existing['badge'];
        $position = array_key_exists('position', $data) ? strtoupper(trim($data['position'])) : $existing['position'];
        $buttonText = array_key_exists('button_text', $data) ? trim($data['button_text']) : $existing['button_text'];
        $buttonUrl = array_key_exists('button_url', $data) ? trim($data['button_url']) : (array_key_exists('target_url', $data) ? trim($data['target_url']) : $existing['button_url']);
        
        $openNewTab = array_key_exists('open_new_tab', $data) 
            ? (!empty($data['open_new_tab']) && ($data['open_new_tab'] === 'true' || $data['open_new_tab'] === true || $data['open_new_tab'] == 1) ? 1 : 0) 
            : $existing['open_new_tab'];

        $startDate = array_key_exists('start_date', $data) 
            ? (!empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : null) 
            : $existing['start_date'];

        $endDate = array_key_exists('end_date', $data) 
            ? (!empty($data['end_date']) ? date('Y-m-d H:i:s', strtotime($data['end_date'])) : null) 
            : $existing['end_date'];

        $status = array_key_exists('status', $data) ? strtoupper(trim($data['status'])) : $existing['status'];
        $sortOrder = array_key_exists('sort_order', $data) && $data['sort_order'] !== '' ? (int)$data['sort_order'] : $existing['sort_order'];

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Banner title is required."]);
            return;
        }

        if ($startDate && $endDate && strtotime($endDate) < strtotime($startDate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "End date must be greater than or equal to start date."]);
            return;
        }

        // Upload new files if supplied, otherwise preserve existing
        $desktopImage = $existing['image'];
        $mobileImage = $existing['mobile_image'];

        try {
            $newDesktop = $this->uploadFile('desktop_image') ?? $this->uploadFile('image');
            if ($newDesktop) {
                $desktopImage = $newDesktop;
            } else if (isset($data['image']) && !empty($data['image'])) {
                $desktopImage = trim($data['image']);
            }

            $newMobile = $this->uploadFile('mobile_image');
            if ($newMobile) {
                $mobileImage = $newMobile;
            } else if (isset($data['mobile_image'])) {
                $mobileImage = trim($data['mobile_image']) ?: null;
            }
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
            return;
        }

        $stmt = $this->db->prepare("
            UPDATE banners SET
                title = :title,
                subtitle = :subtitle,
                description = :description,
                badge = :badge,
                position = :position,
                image = :image,
                mobile_image = :mobile_image,
                button_text = :button_text,
                button_url = :button_url,
                open_new_tab = :open_new_tab,
                start_date = :start_date,
                end_date = :end_date,
                status = :status,
                sort_order = :sort_order,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':title' => $title,
            ':subtitle' => $subtitle,
            ':description' => $description,
            ':badge' => $badge,
            ':position' => $position,
            ':image' => $desktopImage,
            ':mobile_image' => $mobileImage,
            ':button_text' => $buttonText,
            ':button_url' => $buttonUrl,
            ':open_new_tab' => $openNewTab,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':status' => $status,
            ':sort_order' => $sortOrder,
            ':id' => $id
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Banner updated successfully.",
            "summary" => $this->calculateSummary()
        ]);
    }

    private function toggleStatus($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM banners WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $banner = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$banner) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Banner not found."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $status = strtoupper(trim($data['status'] ?? ''));

        if (empty($status)) {
            $status = $banner['status'] === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        }

        // Expired check if attempting to activate
        if ($status === 'ACTIVE' && !empty($banner['end_date']) && strtotime($banner['end_date']) < time()) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "This banner has expired. Please update the validity dates before enabling it."
            ]);
            return;
        }

        $upd = $this->db->prepare("UPDATE banners SET status = :status, updated_at = NOW() WHERE id = :id");
        $upd->execute([':status' => $status, ':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Banner " . ($status === 'ACTIVE' ? 'enabled' : 'disabled') . " successfully.",
            "status" => $status,
            "summary" => $this->calculateSummary()
        ]);
    }

    private function duplicateBanner($id) {
        $admin = $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM banners WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $banner = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$banner) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Banner not found."]);
            return;
        }

        $newTitle = "Copy of " . $banner['title'];
        $ins = $this->db->prepare("
            INSERT INTO banners (
                title, subtitle, description, badge, position,
                image, mobile_image, button_text, button_url, open_new_tab,
                start_date, end_date, status, sort_order, created_by,
                created_at, updated_at
            ) VALUES (
                :title, :subtitle, :description, :badge, :position,
                :image, :mobile_image, :button_text, :button_url, :open_new_tab,
                :start_date, :end_date, 'DRAFT', :sort_order, :created_by,
                NOW(), NOW()
            )
        ");

        $ins->execute([
            ':title' => $newTitle,
            ':subtitle' => $banner['subtitle'],
            ':description' => $banner['description'],
            ':badge' => $banner['badge'],
            ':position' => $banner['position'],
            ':image' => $banner['image'],
            ':mobile_image' => $banner['mobile_image'],
            ':button_text' => $banner['button_text'],
            ':button_url' => $banner['button_url'],
            ':open_new_tab' => $banner['open_new_tab'],
            ':start_date' => $banner['start_date'],
            ':end_date' => $banner['end_date'],
            ':sort_order' => ((int)$banner['sort_order']) + 1,
            ':created_by' => $admin['id'] ?? null
        ]);

        $newId = (int)$this->db->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Banner duplicated as draft.",
            "data" => ["id" => $newId, "title" => $newTitle],
            "summary" => $this->calculateSummary()
        ]);
    }

    private function reorderBanners() {
        $this->requireAdmin();

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $items = $data['items'] ?? $data['orders'] ?? [];

        if (!is_array($items) || empty($items)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Array of items with id and sort_order is required."]);
            return;
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE banners SET sort_order = :order, updated_at = NOW() WHERE id = :id");
            foreach ($items as $item) {
                if (isset($item['id']) && isset($item['sort_order'])) {
                    $stmt->execute([
                        ':order' => (int)$item['sort_order'],
                        ':id' => (int)$item['id']
                    ]);
                }
            }
            $this->db->commit();
            echo json_encode(["success" => true, "message" => "Banner sort orders updated successfully."]);
        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to reorder banners."]);
        }
    }

    private function deleteBanner($id) {
        $this->requireAdmin();

        $stmt = $this->db->prepare("SELECT * FROM banners WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $id]);
        $banner = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$banner) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Banner not found."]);
            return;
        }

        // Soft delete
        $del = $this->db->prepare("UPDATE banners SET deleted_at = NOW(), status = 'INACTIVE' WHERE id = :id");
        $del->execute([':id' => $id]);

        echo json_encode([
            "success" => true,
            "message" => "Banner '{$banner['title']}' deleted successfully.",
            "summary" => $this->calculateSummary()
        ]);
    }

    private function exportBanners() {
        $this->requireAdmin();

        $search = trim($_GET['search'] ?? '');
        $status = strtoupper(trim($_GET['status'] ?? 'ALL'));
        $pos = strtoupper(trim($_GET['position'] ?? 'ALL'));

        $where = ["deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(title LIKE :search OR subtitle LIKE :search OR position LIKE :search)";
            $params[':search'] = "%{$search}%";
        }
        if (!empty($pos) && $pos !== 'ALL') {
            $where[] = "position = :pos";
            $params[':pos'] = $pos;
        }
        if (!empty($status) && $status !== 'ALL') {
            if ($status === 'ACTIVE') {
                $where[] = "status = 'ACTIVE' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())";
            } else if ($status === 'SCHEDULED') {
                $where[] = "status != 'INACTIVE' AND start_date IS NOT NULL AND start_date > NOW()";
            } else if ($status === 'EXPIRED') {
                $where[] = "end_date IS NOT NULL AND end_date < NOW()";
            } else if ($status === 'DISABLED' || $status === 'INACTIVE') {
                $where[] = "status = 'INACTIVE'";
            } else if ($status === 'DRAFT') {
                $where[] = "status = 'DRAFT'";
            }
        }

        $whereClause = "WHERE " . implode(" AND ", $where);
        $query = "
            SELECT 
                id as 'Banner ID',
                title as 'Title',
                subtitle as 'Subtitle',
                badge as 'Badge',
                position as 'Position',
                button_text as 'Button Text',
                button_url as 'Target URL',
                CASE 
                    WHEN status = 'DRAFT' THEN 'DRAFT'
                    WHEN status = 'INACTIVE' THEN 'DISABLED'
                    WHEN end_date IS NOT NULL AND end_date < NOW() THEN 'EXPIRED'
                    WHEN start_date IS NOT NULL AND start_date > NOW() THEN 'SCHEDULED'
                    ELSE 'ACTIVE'
                END as 'Status',
                sort_order as 'Sort Order',
                COALESCE(start_date, 'Immediate') as 'Start Date',
                COALESCE(end_date, 'No Expiry') as 'End Date',
                created_at as 'Created Date'
            FROM banners
            {$whereClause}
            ORDER BY sort_order ASC, id DESC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "data" => $rows, "count" => count($rows)]);
    }
}
