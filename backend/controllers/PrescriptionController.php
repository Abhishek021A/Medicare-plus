<?php
// backend/controllers/PrescriptionController.php

require_once '../config/database.php';
require_once '../middleware/AuthMiddleware.php';

class PrescriptionController {
    private $db;
    private $method;
    private $id;
    private $subAction;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();
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
                    $this->exportPrescriptions();
                } else if ($this->id === 'my-prescriptions') {
                    $this->getMyPrescriptions();
                } else if ($this->id) {
                    if ($this->subAction === 'file') {
                        $this->serveFile((int)$this->id);
                    } else if ($this->subAction === 'history') {
                        $this->getPrescriptionHistory((int)$this->id);
                    } else {
                        $this->getPrescriptionDetails((int)$this->id);
                    }
                } else {
                    $currentUser = AuthMiddleware::requireAuth($this->db);
                    $isAdmin = in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);
                    if ($isAdmin) {
                        $this->getAllPrescriptions();
                    } else {
                        $this->getMyPrescriptions();
                    }
                }
                break;

            case 'POST':
                if ($this->id) {
                    if ($this->subAction === 'review' || $this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        http_response_code(405);
                        echo json_encode(["success" => false, "message" => "Method not allowed on ID endpoint"]);
                    }
                } else {
                    $this->uploadPrescription();
                }
                break;

            case 'PUT':
            case 'PATCH':
                if ($this->id) {
                    $this->updateStatus((int)$this->id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Prescription ID required."]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    /**
     * Helper to compute summary counts across statuses
     */
    private function calculateSummary() {
        $query = "
            SELECT 
                COUNT(id) as total,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0) as approved,
                COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) as rejected,
                COALESCE(SUM(CASE WHEN status = 'NEEDS_CLARIFICATION' THEN 1 ELSE 0 END), 0) as needs_clarification
            FROM prescriptions
        ";
        $stmt = $this->db->query($query);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            "total" => (int)($res['total'] ?? 0),
            "pending" => (int)($res['pending'] ?? 0),
            "approved" => (int)($res['approved'] ?? 0),
            "rejected" => (int)($res['rejected'] ?? 0),
            "needsClarification" => (int)($res['needs_clarification'] ?? 0)
        ];
    }

    /**
     * GET /prescriptions/summary
     */
    private function getSummary() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $summary = $this->calculateSummary();
        echo json_encode(["success" => true, "data" => $summary]);
    }

    /**
     * GET /prescriptions (Admin listing with filters, pagination, search, and sorting)
     */
    private function getAllPrescriptions() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $dateFilter = trim($_GET['date'] ?? ($_GET['date_range'] ?? ''));
        $fromDate = trim($_GET['from_date'] ?? '');
        $toDate = trim($_GET['to_date'] ?? '');
        $sort = trim($_GET['sort'] ?? 'newest');
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        // Search: prescription ID, customer name, email, phone, order number
        if ($search !== '') {
            $where[] = "(
                p.prescription_number LIKE :s1 
                OR u.name LIKE :s2 
                OR u.email LIKE :s3 
                OR u.phone LIKE :s4 
                OR o.order_number LIKE :s5
            )";
            $params[':s1'] = "%{$search}%";
            $params[':s2'] = "%{$search}%";
            $params[':s3'] = "%{$search}%";
            $params[':s4'] = "%{$search}%";
            $params[':s5'] = "%{$search}%";
        }

        // Status Filter
        if ($status !== '' && strtolower($status) !== 'all') {
            $normStatus = strtoupper(str_replace(' ', '_', $status));
            $where[] = "p.status = :status";
            $params[':status'] = $normStatus;
        }

        // Date Filter
        if ($dateFilter === 'today') {
            $where[] = "DATE(p.created_at) = CURDATE()";
        } else if ($dateFilter === 'yesterday') {
            $where[] = "DATE(p.created_at) = SUBDATE(CURDATE(), 1)";
        } else if ($dateFilter === 'last_7_days') {
            $where[] = "p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        } else if ($dateFilter === 'last_30_days') {
            $where[] = "p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        } else if ($dateFilter === 'this_month') {
            $where[] = "MONTH(p.created_at) = MONTH(CURDATE()) AND YEAR(p.created_at) = YEAR(CURDATE())";
        } else if (!empty($fromDate) && !empty($toDate)) {
            $where[] = "DATE(p.created_at) BETWEEN :fromDate AND :toDate";
            $params[':fromDate'] = $fromDate;
            $params[':toDate'] = $toDate;
        }

        $whereClause = !empty($where) ? ' WHERE ' . implode(' AND ', $where) : '';

        // Sorting
        $orderBy = " ORDER BY p.created_at DESC ";
        switch ($sort) {
            case 'oldest':
                $orderBy = " ORDER BY p.created_at ASC ";
                break;
            case 'updated':
                $orderBy = " ORDER BY p.updated_at DESC ";
                break;
            case 'customer_asc':
                $orderBy = " ORDER BY u.name ASC ";
                break;
            case 'customer_desc':
                $orderBy = " ORDER BY u.name DESC ";
                break;
            case 'newest':
            default:
                $orderBy = " ORDER BY p.created_at DESC ";
                break;
        }

        // Count total matching rows
        $countQuery = "
            SELECT COUNT(p.id) as total 
            FROM prescriptions p 
            LEFT JOIN users u ON p.user_id = u.id 
            LEFT JOIN orders o ON p.order_id = o.id 
            {$whereClause}
        ";
        $countStmt = $this->db->prepare($countQuery);
        foreach ($params as $key => $val) {
            $countStmt->bindValue($key, $val);
        }
        $countStmt->execute();
        $total = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        $totalPages = ceil($total / $limit) ?: 1;

        // Fetch paginated prescriptions
        $query = "
            SELECT 
                p.id,
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as prescription_number,
                p.user_id,
                p.order_id,
                p.file_path,
                p.original_filename,
                p.mime_type,
                p.file_size,
                p.status,
                p.rejection_reason,
                p.customer_message,
                p.admin_notes,
                p.reviewed_by,
                p.reviewed_at,
                p.created_at,
                p.updated_at,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                o.order_number,
                o.total_amount as order_total,
                o.order_status,
                rev.name as reviewer_name
            FROM prescriptions p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN orders o ON p.order_id = o.id
            LEFT JOIN users rev ON p.reviewed_by = rev.id
            {$whereClause}
            {$orderBy}
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($query);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Normalize file URLs so frontend can display / preview
        $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";
        $prescriptions = array_map(function($row) use ($baseUrl) {
            $row['file_url'] = $baseUrl . ltrim($row['file_path'], '/');
            return $row;
        }, $rows);

        $summary = $this->calculateSummary();

        echo json_encode([
            "success" => true,
            "data" => [
                "prescriptions" => $prescriptions,
                "pagination" => [
                    "page" => $page,
                    "limit" => $limit,
                    "total" => $total,
                    "totalPages" => $totalPages
                ],
                "summary" => $summary
            ]
        ]);
    }

    /**
     * GET /prescriptions/{id} (Single Prescription Details)
     */
    private function getPrescriptionDetails($id) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $currentUserId = (int)$currentUser['id'];
        $isAdmin = in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);

        $query = "
            SELECT 
                p.id,
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as prescription_number,
                p.user_id,
                p.order_id,
                p.file_path,
                p.original_filename,
                p.mime_type,
                p.file_size,
                p.status,
                p.rejection_reason,
                p.customer_message,
                p.admin_notes,
                p.reviewed_by,
                p.reviewed_at,
                p.created_at,
                p.updated_at,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                o.order_number,
                o.total_amount as order_total,
                o.order_status,
                o.payment_status,
                rev.name as reviewer_name
            FROM prescriptions p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN orders o ON p.order_id = o.id
            LEFT JOIN users rev ON p.reviewed_by = rev.id
            WHERE p.id = :id
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':id' => $id]);
        $prescription = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$prescription) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Prescription not found."]);
            return;
        }

        // Ownership and privacy authorization check
        if (!$isAdmin && (int)$prescription['user_id'] !== $currentUserId) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "You are not authorized to view this prescription."]);
            return;
        }

        // Non-admin customers must not see internal admin notes
        if (!$isAdmin) {
            unset($prescription['admin_notes']);
        }

        $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";
        $prescription['file_url'] = $baseUrl . ltrim($prescription['file_path'], '/');

        // Fetch prescription audit status history
        $histStmt = $this->db->prepare("
            SELECT 
                psh.id,
                psh.old_status,
                psh.new_status,
                psh.notes,
                psh.created_at,
                u.name as admin_name
            FROM prescription_status_history psh
            LEFT JOIN users u ON psh.admin_id = u.id
            WHERE psh.prescription_id = :id
            ORDER BY psh.created_at ASC
        ");
        $histStmt->execute([':id' => $id]);
        $prescription['history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch linked order items if linked
        if (!empty($prescription['order_id'])) {
            $itemStmt = $this->db->prepare("
                SELECT oi.id, oi.product_id, oi.product_name, oi.quantity, oi.price, p.sku, p.image 
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = :order_id
            ");
            $itemStmt->execute([':order_id' => $prescription['order_id']]);
            $prescription['order_items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $prescription['order_items'] = [];
        }

        $responseData = array_merge($prescription, [
            "prescription" => $prescription,
            "customer" => [
                "id" => $prescription['user_id'],
                "name" => $prescription['customer_name'] ?? 'Customer',
                "email" => $prescription['customer_email'] ?? '',
                "phone" => $prescription['customer_phone'] ?? ''
            ],
            "order" => !empty($prescription['order_id']) ? [
                "id" => $prescription['order_id'],
                "order_number" => $prescription['order_number'] ?? '',
                "status" => $prescription['order_status'] ?? '',
                "total" => $prescription['order_total'] ?? 0
            ] : null,
            "file" => [
                "url" => $prescription['file_url'],
                "type" => $prescription['mime_type'] ?? 'image/jpeg',
                "original_filename" => $prescription['original_filename'] ?? '',
                "file_size" => $prescription['file_size'] ?? 0
            ],
            "history" => $prescription['history']
        ]);

        echo json_encode([
            "success" => true,
            "data" => $responseData,
            "prescription" => $prescription
        ]);
    }

    /**
     * PUT/PATCH /prescriptions/{id} (Admin Review: Approve / Reject / Needs Clarification)
     */
    private function updateStatus($id) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
        $status = strtoupper(trim($data['status'] ?? ($data['decision'] ?? '')));
        if ($status === 'APPROVE') $status = 'APPROVED';
        if ($status === 'REJECT') $status = 'REJECTED';
        if ($status === 'CLARIFICATION' || $status === 'NEEDS CLARIFICATION') $status = 'NEEDS_CLARIFICATION';

        $adminNotes = trim($data['admin_notes'] ?? ($data['notes'] ?? ''));
        $customerMessage = trim($data['customer_message'] ?? ($data['message'] ?? ''));
        $rejectionReason = trim($data['rejection_reason'] ?? ($data['reason'] ?? ''));
        $adminId = (int)$currentUser['id'];

        $allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION'];
        if (!in_array($status, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Invalid status. Supported decisions: Approve, Reject, Needs Clarification"
            ]);
            return;
        }

        if ($status === 'REJECTED' && empty($rejectionReason)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Please select a rejection reason."]);
            return;
        }

        if ($status === 'NEEDS_CLARIFICATION' && empty($customerMessage)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Please provide clarification instructions for the customer."]);
            return;
        }

        try {
            $this->db->beginTransaction();

            $checkStmt = $this->db->prepare("SELECT * FROM prescriptions WHERE id = :id FOR UPDATE");
            $checkStmt->execute([':id' => $id]);
            $prescription = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$prescription) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Prescription not found."]);
                return;
            }

            // Prevent redundant reviews
            if ($prescription['status'] === 'APPROVED' && $status === 'APPROVED') {
                $this->db->rollBack();
                http_response_code(409);
                echo json_encode(["success" => false, "message" => "This prescription is already approved."]);
                return;
            }

            if ($prescription['status'] === 'REJECTED' && $status === 'REJECTED') {
                $this->db->rollBack();
                http_response_code(409);
                echo json_encode(["success" => false, "message" => "This prescription is already rejected."]);
                return;
            }

            $oldStatus = $prescription['status'];

            // Update prescription record
            $isPending = ($status === 'PENDING');
            $updStmt = $this->db->prepare("
                UPDATE prescriptions 
                SET 
                    status = :status,
                    admin_notes = :admin_notes,
                    customer_message = :customer_message,
                    rejection_reason = :rejection_reason,
                    reviewed_by = :admin_id,
                    reviewed_at = " . ($isPending ? "NULL" : "NOW()") . ",
                    updated_at = NOW()
                WHERE id = :id
            ");
            $updStmt->execute([
                ':status' => $status,
                ':admin_notes' => $isPending ? null : ($adminNotes ?: $prescription['admin_notes']),
                ':customer_message' => $customerMessage ?: $prescription['customer_message'],
                ':rejection_reason' => $status === 'REJECTED' ? $rejectionReason : null,
                ':admin_id' => $isPending ? null : $adminId,
                ':id' => $id
            ]);

            // Insert into prescription_status_history
            $historyNotes = $adminNotes;
            if ($status === 'REJECTED') {
                $historyNotes = "Rejected: {$rejectionReason}" . ($adminNotes ? " - {$adminNotes}" : "");
            } else if ($status === 'NEEDS_CLARIFICATION') {
                $historyNotes = "Clarification Requested: {$customerMessage}";
            } else if ($status === 'APPROVED' && empty($historyNotes)) {
                $historyNotes = "Prescription verified and approved by admin.";
            }

            $histStmt = $this->db->prepare("
                INSERT INTO prescription_status_history 
                (prescription_id, old_status, new_status, reason, notes, admin_id, created_at) 
                VALUES (:prescription_id, :old_status, :new_status, :reason, :notes, :admin_id, NOW())
            ");
            $histStmt->execute([
                ':prescription_id' => $id,
                ':old_status' => $oldStatus,
                ':new_status' => $status,
                ':reason' => $status === 'REJECTED' ? $rejectionReason : null,
                ':notes' => $historyNotes,
                ':admin_id' => $adminId
            ]);

            $this->db->commit();

            // Fetch refreshed updated prescription
            $fetchStmt = $this->db->prepare("
                SELECT 
                    p.*,
                    u.name as customer_name,
                    u.email as customer_email,
                    u.phone as customer_phone,
                    rev.name as reviewer_name,
                    rev.name as reviewed_by_name
                FROM prescriptions p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN users rev ON p.reviewed_by = rev.id
                WHERE p.id = :id
            ");
            $fetchStmt->execute([':id' => $id]);
            $updated = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            $summary = $this->calculateSummary();

            echo json_encode([
                "success" => true,
                "message" => "Prescription {$status} successfully.",
                "data" => [
                    "prescription" => $updated,
                    "summary" => $summary
                ],
                "prescription" => $updated,
                "summary" => $summary
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update prescription: " . $e->getMessage()]);
        }
    }

    /**
     * POST /prescriptions (Customer File Upload)
     */
    private function uploadPrescription() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        if (!isset($_FILES['file']) && !isset($_FILES['prescriptionFile']) && !isset($_FILES['prescription'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No prescription file was uploaded."]);
            return;
        }

        $file = $_FILES['file'] ?? ($_FILES['prescriptionFile'] ?? $_FILES['prescription']);

        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "File upload error code: " . $file['error']]);
            return;
        }

        // Validate file size (max 8MB)
        $maxBytes = 8 * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "File size exceeds the 8MB limit."]);
            return;
        }

        // Validate MIME type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'application/pdf' => 'pdf'
        ];

        if (!array_key_exists($mime, $allowedMimes)) {
            // Also check client extension fallback for SVGs if finfo returns text/plain or text/xml
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if ($ext === 'svg' && in_array($mime, ['text/plain', 'text/xml', 'image/svg+xml'])) {
                $mime = 'image/svg+xml';
            } else {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid file format ($mime). Only JPG, PNG, WEBP, SVG, and PDF files are allowed."
                ]);
                return;
            }
        }

        $extension = $allowedMimes[$mime] ?? 'jpg';
        $safeFilename = 'rx_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
        $targetDir = __DIR__ . '/../uploads/prescriptions';

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $targetPath = $targetDir . '/' . $safeFilename;
        $relativePath = 'uploads/prescriptions/' . $safeFilename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to save prescription file to server storage."]);
            return;
        }

        $orderId = isset($_POST['order_id']) && is_numeric($_POST['order_id']) ? (int)$_POST['order_id'] : null;
        $customerMsg = trim($_POST['customer_message'] ?? ($_POST['notes'] ?? ''));

        try {
            $this->db->beginTransaction();

            $insertStmt = $this->db->prepare("
                INSERT INTO prescriptions 
                (user_id, order_id, file_path, original_filename, mime_type, file_size, status, customer_message, created_at) 
                VALUES (:user_id, :order_id, :file_path, :original_filename, :mime_type, :file_size, 'PENDING', :customer_message, NOW())
            ");
            $insertStmt->execute([
                ':user_id' => $userId,
                ':order_id' => $orderId,
                ':file_path' => $relativePath,
                ':original_filename' => htmlspecialchars($file['name']),
                ':mime_type' => $mime,
                ':file_size' => (int)$file['size'],
                ':customer_message' => $customerMsg ?: 'Prescription uploaded by customer'
            ]);

            $newId = (int)$this->db->lastInsertId();
            $rxNumber = 'RX-' . str_pad($newId, 4, '0', STR_PAD_LEFT);

            // Populate prescription_number
            $numStmt = $this->db->prepare("UPDATE prescriptions SET prescription_number = :num WHERE id = :id");
            $numStmt->execute([':num' => $rxNumber, ':id' => $newId]);

            // Add history
            $histStmt = $this->db->prepare("
                INSERT INTO prescription_status_history 
                (prescription_id, old_status, new_status, notes, admin_id, created_at) 
                VALUES (:rx_id, NULL, 'PENDING', 'Prescription document uploaded by customer', NULL, NOW())
            ");
            $histStmt->execute([':rx_id' => $newId]);

            $this->db->commit();

            try {
                require_once __DIR__ . '/../services/NotificationService.php';
                $notifService = new NotificationService($this->db);
                $notifService->notifyPrescriptionUploaded($newId, $rxNumber, $currentUser['name'] ?? 'Patient');
            } catch (Exception $notifEx) {
                error_log("Failed to trigger prescription notification: " . $notifEx->getMessage());
            }

            $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";

            echo json_encode([
                "success" => true,
                "message" => "Prescription uploaded successfully. Our certified pharmacists will review it shortly.",
                "data" => [
                    "id" => $newId,
                    "prescription_number" => $rxNumber,
                    "status" => "PENDING",
                    "file_url" => $baseUrl . $relativePath
                ]
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if (file_exists($targetPath)) {
                unlink($targetPath);
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error saving prescription: " . $e->getMessage()]);
        }
    }

    /**
     * GET /prescriptions/export (Export metadata to CSV)
     */
    private function exportPrescriptions() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        if (!in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Admin permissions required."]);
            return;
        }

        $query = "
            SELECT 
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as 'Prescription ID',
                u.name as 'Customer Name',
                u.email as 'Email',
                u.phone as 'Phone',
                p.status as 'Status',
                COALESCE(o.order_number, 'None') as 'Linked Order',
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as 'Uploaded Date',
                COALESCE(rev.name, 'Not Reviewed') as 'Reviewed By',
                COALESCE(DATE_FORMAT(p.reviewed_at, '%Y-%m-%d %H:%i'), '—') as 'Reviewed At',
                COALESCE(p.rejection_reason, '—') as 'Rejection Reason'
            FROM prescriptions p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN orders o ON p.order_id = o.id
            LEFT JOIN users rev ON p.reviewed_by = rev.id
            ORDER BY p.created_at DESC
        ";
        $stmt = $this->db->query($query);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["success" => true, "data" => $data]);
    }

    /**
     * GET /prescriptions/my-prescriptions (Customer listing of their own prescriptions)
     */
    private function getMyPrescriptions() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $userId = (int)$currentUser['id'];

        $query = "
            SELECT 
                p.id,
                COALESCE(p.prescription_number, CONCAT('RX-', LPAD(p.id, 4, '0'))) as prescription_number,
                p.file_path,
                p.original_filename,
                p.mime_type,
                p.status,
                p.customer_message,
                p.rejection_reason,
                p.reviewed_at,
                p.created_at,
                o.order_number
            FROM prescriptions p
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE p.user_id = :user_id
            ORDER BY p.created_at DESC
        ";
        $stmt = $this->db->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";
        $prescriptions = array_map(function($row) use ($baseUrl) {
            $row['file_url'] = $baseUrl . ltrim($row['file_path'], '/');
            return $row;
        }, $rows);

        echo json_encode([
            "success" => true,
            "data" => [
                "prescriptions" => $prescriptions
            ]
        ]);
    }

    /**
     * GET /prescriptions/{id}/file (Protected file streaming)
     */
    private function serveFile($id) {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $currentUserId = (int)$currentUser['id'];
        $isAdmin = in_array($currentUser['role'] ?? '', ['SUPER_ADMIN', 'ADMIN', 'PHARMACY_MANAGER']);

        $stmt = $this->db->prepare("SELECT user_id, file_path, mime_type, original_filename FROM prescriptions WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $rx = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rx) {
            http_response_code(404);
            echo "Prescription file not found.";
            return;
        }

        if (!$isAdmin && (int)$rx['user_id'] !== $currentUserId) {
            http_response_code(403);
            echo "Forbidden.";
            return;
        }

        $fullPath = __DIR__ . '/../' . ltrim($rx['file_path'], '/');
        if (!file_exists($fullPath)) {
            http_response_code(404);
            echo "Physical file does not exist on disk.";
            return;
        }

        header("Content-Type: " . ($rx['mime_type'] ?: 'application/octet-stream'));
        header("Content-Length: " . filesize($fullPath));
        header("Cache-Control: private, max-age=3600");
        readfile($fullPath);
        exit();
    }
}
?>
