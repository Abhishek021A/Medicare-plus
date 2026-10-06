<?php
// backend/controllers/SettingsController.php
require_once __DIR__ . '/../config/database.php';

class SettingsController {
    private $method;
    private $id;
    private $subAction;
    private $db;
    private $adminUser = null;

    public function __construct($method, $id = null, $subAction = null) {
        $this->method = $method;
        $this->id = $id;
        $this->subAction = $subAction;

        $database = new Database();
        $this->db = $database->getConnection();
    }

    private function getAuthHeader() {
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization'])) {
                return $headers['Authorization'];
            }
        }
        return '';
    }

    private function checkAdminAuth() {
        $authHeader = $this->getAuthHeader();
        if (empty($authHeader) || (
            strpos($authHeader, 'Bearer mock-admin-token-123') === false &&
            strpos($authHeader, 'Bearer ') === false
        )) {
            return false;
        }

        $this->adminUser = [
            'id' => 1,
            'role' => 'SUPER_ADMIN'
        ];
        return true;
    }

    public function processRequest() {
        if (!$this->db) {
            http_response_code(503);
            echo json_encode(["success" => false, "message" => "Database connection error"]);
            return;
        }

        // Public settings endpoint: GET /settings/public
        if ($this->id === 'public' && $this->method === 'GET') {
            $this->getPublicSettings();
            return;
        }

        // Upload endpoint: POST /settings/upload
        if ($this->id === 'upload' && $this->method === 'POST') {
            if (!$this->checkAdminAuth()) {
                http_response_code(401);
                echo json_encode(["success" => false, "message" => "Unauthorized admin access"]);
                return;
            }
            $this->uploadAsset();
            return;
        }

        // Reset endpoint: POST /settings/reset
        if ($this->id === 'reset' && $this->method === 'POST') {
            if (!$this->checkAdminAuth()) {
                http_response_code(401);
                echo json_encode(["success" => false, "message" => "Unauthorized admin access"]);
                return;
            }
            $this->resetSettings();
            return;
        }

        // All other settings actions require Admin Authentication
        if (!$this->checkAdminAuth()) {
            // If request is GET and without token, fallback to public settings
            if ($this->method === 'GET') {
                $this->getPublicSettings();
                return;
            }
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Unauthorized admin access"]);
            return;
        }

        switch ($this->method) {
            case 'GET':
                $this->getAdminSettings();
                break;
            case 'POST':
            case 'PUT':
            case 'PATCH':
                $this->updateSettings();
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Method not allowed"]);
                break;
        }
    }

    /**
     * Public Settings: Returns ONLY safe public settings (is_public = 1, is_encrypted = 0)
     */
    private function getPublicSettings() {
        try {
            $stmt = $this->db->query("
                SELECT setting_key, setting_value, setting_type, setting_group 
                FROM settings 
                WHERE is_public = 1 AND is_encrypted = 0
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $settings = [];
            foreach ($rows as $row) {
                $settings[$row['setting_key']] = $this->castValue($row['setting_value'], $row['setting_type']);
            }

            echo json_encode([
                "success" => true,
                "data" => $settings
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * Admin Settings: Returns all settings with sensitive secrets masked
     */
    private function getAdminSettings() {
        try {
            $stmt = $this->db->query("
                SELECT setting_key, setting_value, setting_type, setting_group, is_public, is_encrypted, updated_at 
                FROM settings 
                ORDER BY setting_group ASC, setting_key ASC
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $grouped = [];
            $flat = [];

            foreach ($rows as $row) {
                $key = $row['setting_key'];
                $group = $row['setting_group'];
                $type = $row['setting_type'];
                $isEncrypted = (int)$row['is_encrypted'] === 1;

                // Mask sensitive server secrets
                if ($isEncrypted) {
                    $displayValue = !empty($row['setting_value']) ? '••••••••••••' : '';
                } else {
                    $displayValue = $this->castValue($row['setting_value'], $type);
                }

                $flat[$key] = $displayValue;

                if (!isset($grouped[$group])) {
                    $grouped[$group] = [];
                }
                $grouped[$group][$key] = [
                    'key' => $key,
                    'value' => $displayValue,
                    'type' => $type,
                    'is_public' => (int)$row['is_public'] === 1,
                    'is_encrypted' => $isEncrypted,
                    'updated_at' => $row['updated_at']
                ];
            }

            echo json_encode([
                "success" => true,
                "data" => [
                    "settings" => $flat,
                    "grouped" => $grouped
                ]
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * Update Settings
     */
    private function updateSettings() {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw, true);

        if (!$data) {
            $data = $_POST;
        }

        // Support both { settings: { ... } } and direct key-value { store_name: "..." }
        $settingsToUpdate = isset($data['settings']) && is_array($data['settings']) ? $data['settings'] : $data;

        if (empty($settingsToUpdate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No settings provided for update"]);
            return;
        }

        try {
            $this->db->beginTransaction();

            $updateStmt = $this->db->prepare("
                UPDATE settings 
                SET setting_value = :val, updated_at = NOW() 
                WHERE setting_key = :key
            ");

            $insertStmt = $this->db->prepare("
                INSERT INTO settings (setting_key, setting_value, setting_type, setting_group, is_public, is_encrypted, created_at, updated_at)
                VALUES (:key, :val, :type, :group, :pub, 0, NOW(), NOW())
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");

            $updatedCount = 0;

            foreach ($settingsToUpdate as $key => $val) {
                // Ignore internal fields
                if (in_array($key, ['token', 'user', '_method', 'settings'])) {
                    continue;
                }

                // If value is a masked secret string, do not overwrite the real server secret!
                if ($val === '••••••••••••') {
                    continue;
                }

                // Sanitize and convert values
                if (is_bool($val)) {
                    $dbVal = $val ? '1' : '0';
                } elseif (is_array($val)) {
                    $dbVal = json_encode($val);
                } elseif ($val === null) {
                    $dbVal = '';
                } else {
                    $dbVal = trim((string)$val);
                }

                // Validate specific keys
                if ($key === 'store_email' || $key === 'support_email' || $key === 'from_email') {
                    if (!empty($dbVal) && !filter_var($dbVal, FILTER_VALIDATE_EMAIL)) {
                        $this->db->rollBack();
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Invalid email format for {$key}"]);
                        return;
                    }
                }

                if (strpos($key, 'social_') === 0 || $key === 'website_url' || $key === 'canonical_url') {
                    if (!empty($dbVal) && !filter_var($dbVal, FILTER_VALIDATE_URL)) {
                        $this->db->rollBack();
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Invalid URL format for {$key}"]);
                        return;
                    }
                }

                if (in_array($key, ['delivery_charge', 'free_delivery_above', 'min_order_amount', 'default_tax_rate'])) {
                    if (!is_numeric($dbVal) || (float)$dbVal < 0) {
                        $this->db->rollBack();
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Numeric values must be 0 or greater for {$key}"]);
                        return;
                    }
                }

                $updateStmt->execute([
                    ':val' => $dbVal,
                    ':key' => $key
                ]);

                if ($updateStmt->rowCount() > 0) {
                    $updatedCount++;
                } else {
                    // Check if key exists; if not, insert
                    $existsStmt = $this->db->prepare("SELECT setting_key FROM settings WHERE setting_key = :k");
                    $existsStmt->execute([':k' => $key]);
                    if (!$existsStmt->fetch()) {
                        $insertStmt->execute([
                            ':key' => $key,
                            ':val' => $dbVal,
                            ':type' => is_array($val) ? 'json' : (is_numeric($val) ? 'number' : (is_bool($val) ? 'boolean' : 'string')),
                            ':group' => 'general',
                            ':pub' => 1
                        ]);
                        $updatedCount++;
                    }
                }
            }

            $this->db->commit();

            echo json_encode([
                "success" => true,
                "message" => "Settings saved successfully",
                "data" => ["updated_count" => $updatedCount]
            ]);

        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    }

    /**
     * Upload Store Logo or Favicon
     */
    private function uploadAsset() {
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No file uploaded"]);
            return;
        }

        $file = $_FILES['file'];
        $type = $_POST['type'] ?? 'store_logo'; // 'store_logo' | 'favicon'

        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "File upload error: code " . $file['error']]);
            return;
        }

        // Validate max 2MB
        if ($file['size'] > 2 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "File size exceeds 2MB limit"]);
            return;
        }

        // Validate MIME type
        $allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime, $allowedMimes)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid image type. Allowed: PNG, JPEG, WEBP, ICO, SVG"]);
            return;
        }

        $targetDir = __DIR__ . '/../uploads/settings';
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeName = $type . '_' . time() . '.' . strtolower($ext);
        $destPath = $targetDir . '/' . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to save uploaded asset"]);
            return;
        }

        $baseUrl = "http://" . ($_SERVER['HTTP_HOST'] ?? 'localhost:8080') . "/pharmacy_api/";
        $relativePath = 'uploads/settings/' . $safeName;
        $fullUrl = $baseUrl . $relativePath;

        // Automatically update the setting in database
        $stmt = $this->db->prepare("UPDATE settings SET setting_value = :val, updated_at = NOW() WHERE setting_key = :k");
        $stmt->execute([
            ':val' => $fullUrl,
            ':k' => $type
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Asset uploaded and setting updated successfully",
            "data" => [
                "setting_key" => $type,
                "url" => $fullUrl,
                "relative_path" => $relativePath
            ]
        ]);
    }

    /**
     * Reset Settings to System Defaults
     */
    private function resetSettings() {
        require_once __DIR__ . '/../setup_settings_table.php';
        echo json_encode([
            "success" => true,
            "message" => "Settings restored to system defaults successfully"
        ]);
    }

    /**
     * Helper to cast values based on setting_type
     */
    private function castValue($val, $type) {
        if ($val === null) return '';
        switch ($type) {
            case 'boolean':
                return $val === '1' || $val === 'true' || $val === 1 || $val === true;
            case 'number':
                return strpos($val, '.') !== false ? (float)$val : (int)$val;
            case 'json':
                $decoded = json_decode($val, true);
                return $decoded !== null ? $decoded : $val;
            default:
                return (string)$val;
        }
    }
}
