<?php
// backend/controllers/ManagerController.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ManagerController {
    private $db;
    private $method;
    private $id;
    private $subAction;
    private $currentAdmin = null;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * Verify caller is an authenticated administrator with Super Admin or Admin role.
     */
    private function authenticateSuperAdmin() {
        $user = AuthMiddleware::getAuthenticatedUser($this->db);
        if (!$user) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Unauthorized access. Please log in."]);
            exit();
        }

        $role = strtoupper($user['role'] ?? '');
        if (!in_array($role, ['SUPER_ADMIN', 'ADMIN'])) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Access denied. Only Super Administrators can manage staff manager accounts."]);
            exit();
        }

        $this->currentAdmin = $user;
        return $user;
    }

    /**
     * Record security audit log
     */
    private function logAudit($action, $module, $description) {
        try {
            $stmt = $this->db->prepare("INSERT INTO audit_logs (user_id, user_name, action, module, description, ip_address) VALUES (:uid, :un, :act, :mod, :desc, :ip)");
            $stmt->execute([
                ':uid' => $this->currentAdmin['id'] ?? null,
                ':un' => $this->currentAdmin['name'] ?? 'Super Admin',
                ':act' => $action,
                ':mod' => $module,
                ':desc' => $description,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Exception $e) {
            // Silently continue if audit log table fails
        }
    }

    public function processRequest() {
        if (!$this->db) {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Database connection unavailable."]);
            return;
        }

        $this->authenticateSuperAdmin();

        // Support _method override
        if ($this->method === 'POST' && isset($_POST['_method']) && in_array(strtoupper($_POST['_method']), ['PUT', 'PATCH', 'DELETE'])) {
            $this->method = strtoupper($_POST['_method']);
        }

        switch ($this->method) {
            case 'GET':
                if ($this->id === 'summary') {
                    $this->getSummary();
                } elseif ($this->id === 'export') {
                    $this->exportManagers();
                } elseif ($this->id) {
                    if ($this->subAction === 'permissions') {
                        $this->getPermissions((int)$this->id);
                    } elseif ($this->subAction === 'activity') {
                        $this->getActivity((int)$this->id);
                    } else {
                        $this->getManager((int)$this->id);
                    }
                } else {
                    $this->getManagers();
                }
                break;

            case 'POST':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } elseif ($this->subAction === 'reset-password') {
                        $this->resetPassword((int)$this->id);
                    } elseif ($this->subAction === 'permissions') {
                        $this->savePermissions((int)$this->id);
                    } else {
                        $this->updateManager((int)$this->id);
                    }
                } else {
                    $this->createManager();
                }
                break;

            case 'PUT':
                if ($this->id) {
                    if ($this->subAction === 'permissions') {
                        $this->savePermissions((int)$this->id);
                    } elseif ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        $this->updateManager((int)$this->id);
                    }
                }
                break;

            case 'PATCH':
                if ($this->id) {
                    if ($this->subAction === 'status') {
                        $this->updateStatus((int)$this->id);
                    } else {
                        $this->updateManager((int)$this->id);
                    }
                }
                break;

            case 'DELETE':
                if ($this->id) {
                    $this->deleteManager((int)$this->id);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    /**
     * GET /admin/managers/summary
     * Real database counts for managers
     */
    private function getSummary() {
        $managerRoles = "'MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'";

        // Total
        $totalStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role IN ($managerRoles) AND (deleted_at IS NULL)");
        $total = (int)$totalStmt->fetchColumn();

        // Active
        $activeStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role IN ($managerRoles) AND status = 'ACTIVE' AND (deleted_at IS NULL)");
        $active = (int)$activeStmt->fetchColumn();

        // Inactive
        $inactiveStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role IN ($managerRoles) AND status = 'INACTIVE' AND (deleted_at IS NULL)");
        $inactive = (int)$inactiveStmt->fetchColumn();

        // Suspended/Blocked
        $suspendedStmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role IN ($managerRoles) AND status IN ('BLOCKED', 'SUSPENDED') AND (deleted_at IS NULL)");
        $suspended = (int)$suspendedStmt->fetchColumn();

        echo json_encode([
            "success" => true,
            "data" => [
                "total" => $total,
                "active" => $active,
                "inactive" => $inactive,
                "suspended" => $suspended
            ]
        ]);
    }

    /**
     * GET /admin/managers
     * List managers with search, filters, pagination
     */
    private function getManagers() {
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;

        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? strtoupper(trim($_GET['status'])) : 'ALL';
        $department = isset($_GET['department']) ? trim($_GET['department']) : 'ALL';
        $sortBy = isset($_GET['sort_by']) ? trim($_GET['sort_by']) : 'newest';

        $where = ["role IN ('MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER')", "deleted_at IS NULL"];
        $params = [];

        if (!empty($search)) {
            $where[] = "(name LIKE :search OR email LIKE :search OR phone LIKE :search OR department LIKE :search OR job_title LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        if ($status !== 'ALL') {
            $where[] = "status = :status";
            $params[':status'] = $status;
        }

        if ($department !== 'ALL') {
            $where[] = "department = :department";
            $params[':department'] = $department;
        }

        $whereSql = implode(' AND ', $where);

        // Sorting
        $orderSql = "created_at DESC";
        if ($sortBy === 'oldest') $orderSql = "created_at ASC";
        elseif ($sortBy === 'name_asc') $orderSql = "name ASC";
        elseif ($sortBy === 'name_desc') $orderSql = "name DESC";
        elseif ($sortBy === 'last_login') $orderSql = "last_login DESC";

        // Count total
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE $whereSql");
        $countStmt->execute($params);
        $totalRecords = (int)$countStmt->fetchColumn();

        // Fetch records
        $sql = "SELECT id, name, email, phone, role, status, avatar, job_title, department, created_at, updated_at, last_login 
                FROM users 
                WHERE $whereSql 
                ORDER BY $orderSql 
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $base = 'http://localhost:8080/pharmacy_api';
        $managers = array_map(function($m) use ($base) {
            $nameParts = explode(' ', trim($m['name'] ?? ''), 2);
            $firstName = $nameParts[0] ?? '';
            $lastName = $nameParts[1] ?? '';
            $initials = strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1)) ?: 'M';

            $avatarUrl = null;
            if (!empty($m['avatar'])) {
                if (preg_match('/^(http:\/\/|https:\/\/|data:)/', $m['avatar'])) {
                    $avatarUrl = $m['avatar'];
                } else {
                    $avatarUrl = $base . '/' . ltrim($m['avatar'], '/');
                }
            }

            return [
                "id" => (int)$m['id'],
                "manager_code" => sprintf("MGR-%03d", (int)$m['id']),
                "name" => $m['name'],
                "first_name" => $firstName,
                "last_name" => $lastName,
                "email" => $m['email'],
                "phone" => $m['phone'] ?? '',
                "role" => $m['role'],
                "role_label" => ucwords(strtolower(str_replace('_', ' ', $m['role']))),
                "status" => $m['status'],
                "avatar" => $avatarUrl,
                "initials" => $initials,
                "job_title" => $m['job_title'] ?? 'Staff Manager',
                "department" => $m['department'] ?? 'Operations',
                "created_at" => $m['created_at'],
                "updated_at" => $m['updated_at'],
                "last_login" => $m['last_login']
            ];
        }, $rows);

        // Fetch list of distinct departments for filter dropdown
        $deptStmt = $this->db->query("SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' AND role IN ('MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER')");
        $departments = $deptStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            "success" => true,
            "data" => $managers,
            "managers" => $managers,
            "departments" => $departments,
            "pagination" => [
                "page" => $page,
                "limit" => $limit,
                "total" => $totalRecords,
                "totalPages" => ceil($totalRecords / $limit)
            ]
        ]);
    }

    /**
     * GET /admin/managers/{id}
     */
    private function getManager($id) {
        $stmt = $this->db->prepare("SELECT id, name, email, phone, role, status, avatar, job_title, department, created_at, updated_at, last_login 
            FROM users 
            WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([':id' => $id]);
        $m = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$m) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Manager account not found"]);
            return;
        }

        $base = 'http://localhost:8080/pharmacy_api';
        $nameParts = explode(' ', trim($m['name'] ?? ''), 2);
        $avatarUrl = null;
        if (!empty($m['avatar'])) {
            $avatarUrl = preg_match('/^(http:\/\/|https:\/\/|data:)/', $m['avatar']) ? $m['avatar'] : $base . '/' . ltrim($m['avatar'], '/');
        }

        // Fetch permissions
        $permStmt = $this->db->prepare("SELECT module, can_view, can_create, can_edit, can_delete, can_approve, can_export FROM manager_permissions WHERE user_id = :id");
        $permStmt->execute([':id' => $id]);
        $permissions = $permStmt->fetchAll(PDO::FETCH_ASSOC);

        $permMap = [];
        foreach ($permissions as $p) {
            $permMap[$p['module']] = [
                "view" => (bool)$p['can_view'],
                "create" => (bool)$p['can_create'],
                "edit" => (bool)$p['can_edit'],
                "delete" => (bool)$p['can_delete'],
                "approve" => (bool)$p['can_approve'],
                "export" => (bool)$p['can_export']
            ];
        }

        $managerData = [
            "id" => (int)$m['id'],
            "manager_code" => sprintf("MGR-%03d", (int)$m['id']),
            "name" => $m['name'],
            "first_name" => $nameParts[0] ?? '',
            "last_name" => $nameParts[1] ?? '',
            "email" => $m['email'],
            "phone" => $m['phone'] ?? '',
            "role" => $m['role'],
            "role_label" => ucwords(strtolower(str_replace('_', ' ', $m['role']))),
            "status" => $m['status'],
            "avatar" => $avatarUrl,
            "initials" => strtoupper(substr($nameParts[0] ?? '', 0, 1) . substr($nameParts[1] ?? '', 0, 1)) ?: 'M',
            "job_title" => $m['job_title'] ?? 'Staff Manager',
            "department" => $m['department'] ?? 'Operations',
            "created_at" => $m['created_at'],
            "updated_at" => $m['updated_at'],
            "last_login" => $m['last_login'],
            "permissions" => $permMap
        ];

        echo json_encode([
            "success" => true,
            "data" => $managerData
        ]);
    }

    /**
     * POST /admin/managers
     * Create new manager
     */
    private function createManager() {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !is_array($data)) {
            $data = $_POST;
        }

        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $fullName = trim($data['name'] ?? "$firstName $lastName");
        $email = trim(strtolower($data['email'] ?? ''));
        $phone = trim($data['phone'] ?? '');
        $department = trim($data['department'] ?? 'Operations');
        $jobTitle = trim($data['job_title'] ?? 'Staff Manager');
        $password = $data['password'] ?? '';
        $confirmPassword = $data['confirm_password'] ?? '';
        $status = strtoupper(trim($data['status'] ?? 'ACTIVE'));
        $role = strtoupper(trim($data['role'] ?? 'MANAGER'));

        // Validation
        if (empty($fullName)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Manager full name is required."]);
            return;
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "A valid email address is required."]);
            return;
        }

        if (empty($password) || strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Password must be at least 8 characters in length."]);
            return;
        }

        if (!empty($confirmPassword) && $password !== $confirmPassword) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Passwords do not match."]);
            return;
        }

        // Security: Prevent creating SUPER_ADMIN via manager form
        if ($role === 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Cannot create Super Administrator via manager management form."]);
            return;
        }

        if (!in_array($role, ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'])) {
            $role = 'MANAGER';
        }

        // Check email uniqueness
        $checkStmt = $this->db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "An account with this email address already exists."]);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        // Sanitize strings
        $fullName = htmlspecialchars(strip_tags($fullName), ENT_QUOTES, 'UTF-8');
        $department = htmlspecialchars(strip_tags($department), ENT_QUOTES, 'UTF-8');
        $jobTitle = htmlspecialchars(strip_tags($jobTitle), ENT_QUOTES, 'UTF-8');

        $stmt = $this->db->prepare("INSERT INTO users 
            (name, email, password, phone, role, status, department, job_title, created_at, updated_at) 
            VALUES (:name, :email, :password, :phone, :role, :status, :department, :job_title, NOW(), NOW())");

        $stmt->execute([
            ':name' => $fullName,
            ':email' => $email,
            ':password' => $passwordHash,
            ':phone' => $phone,
            ':role' => $role,
            ':status' => in_array($status, ['ACTIVE', 'INACTIVE', 'SUSPENDED']) ? $status : 'ACTIVE',
            ':department' => $department,
            ':job_title' => $jobTitle
        ]);

        $newId = (int)$this->db->lastInsertId();

        // Seed default permissions for new manager
        $defaultModules = [
            'dashboard'     => [1, 0, 0, 0, 0, 1],
            'products'      => [1, 1, 1, 0, 0, 1],
            'categories'    => [1, 1, 1, 0, 0, 1],
            'brands'        => [1, 1, 1, 0, 0, 1],
            'inventory'     => [1, 1, 1, 0, 0, 1],
            'orders'        => [1, 0, 1, 0, 1, 1],
            'prescriptions' => [1, 0, 1, 0, 1, 1],
            'customers'     => [1, 0, 1, 0, 0, 1],
            'coupons'       => [1, 1, 1, 0, 0, 1],
            'banners'       => [1, 1, 1, 0, 0, 0],
            'blog'          => [1, 1, 1, 0, 0, 0],
            'reviews'       => [1, 0, 1, 0, 1, 1],
            'reports'       => [1, 0, 0, 0, 0, 1],
            'notifications' => [1, 0, 1, 0, 0, 0]
        ];

        // Custom permissions passed in payload if any
        $customPerms = $data['permissions'] ?? [];

        $permInsert = $this->db->prepare("INSERT INTO manager_permissions 
            (user_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export) 
            VALUES (:uid, :mod, :v, :c, :e, :d, :a, :x)");

        foreach ($defaultModules as $mod => $defaults) {
            $v = isset($customPerms[$mod]['view']) ? ($customPerms[$mod]['view'] ? 1 : 0) : $defaults[0];
            $c = isset($customPerms[$mod]['create']) ? ($customPerms[$mod]['create'] ? 1 : 0) : $defaults[1];
            $e = isset($customPerms[$mod]['edit']) ? ($customPerms[$mod]['edit'] ? 1 : 0) : $defaults[2];
            $d = isset($customPerms[$mod]['delete']) ? ($customPerms[$mod]['delete'] ? 1 : 0) : $defaults[3];
            $a = isset($customPerms[$mod]['approve']) ? ($customPerms[$mod]['approve'] ? 1 : 0) : $defaults[4];
            $x = isset($customPerms[$mod]['export']) ? ($customPerms[$mod]['export'] ? 1 : 0) : $defaults[5];

            $permInsert->execute([
                ':uid' => $newId,
                ':mod' => $mod,
                ':v' => $v,
                ':c' => $c,
                ':e' => $e,
                ':d' => $d,
                ':a' => $a,
                ':x' => $x
            ]);
        }

        $this->logAudit('CREATE_MANAGER', 'managers', "Created manager account for $fullName ($email) with role $role");

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Manager account created successfully.",
            "data" => [
                "id" => $newId,
                "name" => $fullName,
                "email" => $email,
                "role" => $role
            ]
        ]);
    }

    /**
     * PUT /admin/managers/{id}
     * Update manager details
     */
    private function updateManager($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data || !is_array($data)) {
            $data = $_POST;
        }

        $stmt = $this->db->prepare("SELECT id, role, email FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Manager account not found"]);
            return;
        }

        // Prevent modifying Super Admin through manager endpoint
        if ($existing['role'] === 'SUPER_ADMIN' && $this->currentAdmin['id'] != $id) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Super Administrator accounts cannot be modified via manager module."]);
            return;
        }

        $fields = [];
        $params = [':id' => $id];

        if (isset($data['name']) || isset($data['first_name'])) {
            $name = '';
            if (!empty($data['name'])) {
                $name = trim($data['name']);
            } else {
                $first = trim($data['first_name'] ?? '');
                $last = trim($data['last_name'] ?? '');
                $name = trim("$first $last");
            }
            if (!empty($name)) {
                $fields[] = "name = :name";
                $params[':name'] = htmlspecialchars(strip_tags($name), ENT_QUOTES, 'UTF-8');
            }
        }

        if (isset($data['email'])) {
            $email = trim(strtolower($data['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Invalid email address format."]);
                return;
            }
            // Check uniqueness
            $check = $this->db->prepare("SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1");
            $check->execute([':email' => $email, ':id' => $id]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Email is already taken by another account."]);
                return;
            }
            $fields[] = "email = :email";
            $params[':email'] = $email;
        }

        if (isset($data['phone'])) {
            $fields[] = "phone = :phone";
            $params[':phone'] = trim($data['phone']);
        }

        if (isset($data['department'])) {
            $fields[] = "department = :department";
            $params[':department'] = htmlspecialchars(strip_tags(trim($data['department'])), ENT_QUOTES, 'UTF-8');
        }

        if (isset($data['job_title'])) {
            $fields[] = "job_title = :job_title";
            $params[':job_title'] = htmlspecialchars(strip_tags(trim($data['job_title'])), ENT_QUOTES, 'UTF-8');
        }

        if (isset($data['status'])) {
            $status = strtoupper(trim($data['status']));
            if (in_array($status, ['ACTIVE', 'INACTIVE', 'SUSPENDED'])) {
                $fields[] = "status = :status";
                $params[':status'] = $status;
            }
        }

        if (isset($data['role']) && in_array(strtoupper($data['role']), ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'])) {
            $fields[] = "role = :role";
            $params[':role'] = strtoupper($data['role']);
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No valid fields provided for update."]);
            return;
        }

        $fields[] = "updated_at = NOW()";
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $updateStmt = $this->db->prepare($sql);
        $updateStmt->execute($params);

        $this->logAudit('UPDATE_MANAGER', 'managers', "Updated manager ID #$id details");

        echo json_encode([
            "success" => true,
            "message" => "Manager profile updated successfully."
        ]);
    }

    /**
     * PATCH /admin/managers/{id}/status
     * Activate, Deactivate, or Suspend manager
     */
    private function updateStatus($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $status = strtoupper(trim($data['status'] ?? ''));

        if (!in_array($status, ['ACTIVE', 'INACTIVE', 'SUSPENDED'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid status. Allowed values: ACTIVE, INACTIVE, SUSPENDED."]);
            return;
        }

        // Prevent deactivating own account
        if ($this->currentAdmin['id'] == $id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "You cannot change the status of your own account."]);
            return;
        }

        $stmt = $this->db->prepare("UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':status' => $status, ':id' => $id]);

        $this->logAudit('STATUS_CHANGE', 'managers', "Changed manager ID #$id status to $status");

        echo json_encode([
            "success" => true,
            "message" => "Manager account status updated to $status."
        ]);
    }

    /**
     * POST /admin/managers/{id}/reset-password
     * Super Admin resets manager password
     */
    private function resetPassword($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $newPassword = $data['new_password'] ?? '';
        $confirmPassword = $data['confirm_password'] ?? '';

        if (empty($newPassword) || strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New password must be at least 8 characters long."]);
            return;
        }

        if (!empty($confirmPassword) && $newPassword !== $confirmPassword) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New password and confirmation password do not match."]);
            return;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare("UPDATE users SET password = :p, updated_at = NOW() WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':p' => $hash, ':id' => $id]);

        $this->logAudit('PASSWORD_RESET', 'managers', "Super Admin reset password for manager ID #$id");

        echo json_encode([
            "success" => true,
            "message" => "Password for manager has been reset successfully."
        ]);
    }

    /**
     * DELETE /admin/managers/{id}
     * Soft delete manager
     */
    private function deleteManager($id) {
        if ($this->currentAdmin['id'] == $id) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "You cannot delete your own administrator account."]);
            return;
        }

        $stmt = $this->db->prepare("SELECT id, name, role FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([':id' => $id]);
        $target = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Manager account not found"]);
            return;
        }

        if ($target['role'] === 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Cannot delete a Super Administrator account."]);
            return;
        }

        // Soft delete: sets deleted_at = NOW() and status = 'INACTIVE'
        $delStmt = $this->db->prepare("UPDATE users SET deleted_at = NOW(), status = 'INACTIVE', updated_at = NOW() WHERE id = :id");
        $delStmt->execute([':id' => $id]);

        $this->logAudit('DELETE_MANAGER', 'managers', "Soft-deleted manager ID #$id ({$target['name']})");

        echo json_encode([
            "success" => true,
            "message" => "Manager account has been deactivated and removed."
        ]);
    }

    /**
     * GET /admin/managers/{id}/permissions
     */
    private function getPermissions($id) {
        $stmt = $this->db->prepare("SELECT module, can_view, can_create, can_edit, can_delete, can_approve, can_export FROM manager_permissions WHERE user_id = :id");
        $stmt->execute([':id' => $id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $permMap = [];
        foreach ($rows as $r) {
            $permMap[$r['module']] = [
                "view" => (bool)$r['can_view'],
                "create" => (bool)$r['can_create'],
                "edit" => (bool)$r['can_edit'],
                "delete" => (bool)$r['can_delete'],
                "approve" => (bool)$r['can_approve'],
                "export" => (bool)$r['can_export']
            ];
        }

        // Ensure all modules are represented
        $allModules = ['dashboard', 'products', 'categories', 'brands', 'inventory', 'orders', 'prescriptions', 'customers', 'coupons', 'banners', 'blog', 'reviews', 'reports', 'notifications'];
        foreach ($allModules as $m) {
            if (!isset($permMap[$m])) {
                $permMap[$m] = [
                    "view" => false, "create" => false, "edit" => false,
                    "delete" => false, "approve" => false, "export" => false
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "user_id" => $id,
                "permissions" => $permMap
            ]
        ]);
    }

    /**
     * POST/PUT /admin/managers/{id}/permissions
     * Update permissions matrix
     */
    private function savePermissions($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        $permissions = $data['permissions'] ?? [];

        if (!is_array($permissions)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid permissions payload"]);
            return;
        }

        $stmt = $this->db->prepare("INSERT INTO manager_permissions 
            (user_id, module, can_view, can_create, can_edit, can_delete, can_approve, can_export) 
            VALUES (:uid, :mod, :v, :c, :e, :d, :a, :x)
            ON DUPLICATE KEY UPDATE 
            can_view = VALUES(can_view), can_create = VALUES(can_create), can_edit = VALUES(can_edit),
            can_delete = VALUES(can_delete), can_approve = VALUES(can_approve), can_export = VALUES(can_export)");

        foreach ($permissions as $mod => $actions) {
            $v = !empty($actions['view']) ? 1 : 0;
            $c = !empty($actions['create']) ? 1 : 0;
            $e = !empty($actions['edit']) ? 1 : 0;
            $d = !empty($actions['delete']) ? 1 : 0;
            $a = !empty($actions['approve']) ? 1 : 0;
            $x = !empty($actions['export']) ? 1 : 0;

            $stmt->execute([
                ':uid' => $id,
                ':mod' => $mod,
                ':v' => $v,
                ':c' => $c,
                ':e' => $e,
                ':d' => $d,
                ':a' => $a,
                ':x' => $x
            ]);
        }

        $this->logAudit('UPDATE_PERMISSIONS', 'managers', "Updated module permissions matrix for manager ID #$id");

        echo json_encode([
            "success" => true,
            "message" => "Permissions saved successfully."
        ]);
    }

    /**
     * GET /admin/managers/{id}/activity
     */
    private function getActivity($id) {
        $stmt = $this->db->prepare("SELECT id, action, module, description, ip_address, created_at 
            FROM audit_logs 
            WHERE user_id = :id 
            ORDER BY created_at DESC 
            LIMIT 20");
        $stmt->execute([':id' => $id]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $logs
        ]);
    }

    /**
     * GET /admin/managers/export
     * Export managers to CSV
     */
    private function exportManagers() {
        $managerRoles = "'MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'";
        $stmt = $this->db->query("SELECT id, name, email, phone, role, status, department, job_title, created_at, last_login 
            FROM users 
            WHERE role IN ($managerRoles) AND deleted_at IS NULL 
            ORDER BY created_at DESC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=managers_export_' . date('Ymd_His') . '.csv');

        $out = fopen('php://output', 'w');
        fputcsv($out, ['Manager ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Department', 'Job Title', 'Created Date', 'Last Login']);

        foreach ($rows as $r) {
            fputcsv($out, [
                sprintf("MGR-%03d", $r['id']),
                $r['name'],
                $r['email'],
                $r['phone'],
                ucwords(strtolower(str_replace('_', ' ', $r['role']))),
                $r['status'],
                $r['department'],
                $r['job_title'],
                $r['created_at'],
                $r['last_login']
            ]);
        }

        fclose($out);
        exit();
    }
}
