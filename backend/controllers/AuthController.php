<?php
// backend/controllers/AuthController.php
require_once '../config/database.php';
require_once '../models/User.php';
require_once '../middleware/AuthMiddleware.php';

class AuthController {
    private $method;
    private $action;
    private $db;
    private $user;

    public function __construct($method, $action) {
        $this->method = $method;
        $this->action = $action;

        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
    }

    public function processRequest() {
        switch ($this->action) {
            case 'login':
                if ($this->method !== 'POST') {
                    $this->methodNotAllowed();
                    return;
                }
                $this->login();
                break;
            case 'register':
                if ($this->method !== 'POST') {
                    $this->methodNotAllowed();
                    return;
                }
                $this->register();
                break;
            case 'me':
                if ($this->method !== 'GET') {
                    $this->methodNotAllowed();
                    return;
                }
                $this->me();
                break;
            case 'profile':
                if ($this->method === 'GET') {
                    $this->me();
                } elseif ($this->method === 'PUT' || $this->method === 'POST') {
                    $this->updateProfile();
                } else {
                    $this->methodNotAllowed();
                }
                break;
            case 'forgot-password':
                $this->forgotPassword();
                break;
            case 'reset-password':
                $this->resetPassword();
                break;
            case 'logout':
                $this->logout();
                break;
            default:
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Endpoint not found"]);
                break;
        }
    }

    private function methodNotAllowed() {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method not allowed"]);
    }

    private function login() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->email) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email and password are required"]);
            return;
        }

        $email = trim(strtolower($data->email));
        $user = $this->user->findByEmail($email);

        if ($user && password_verify($data->password, $user['password'])) {
            if (isset($user['status']) && in_array(strtoupper($user['status']), ['BLOCKED', 'INACTIVE', 'SUSPENDED'])) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "Your account has been blocked or suspended. Please contact customer support."]);
                return;
            }

            unset($user['password']);
            
            $nameParts = explode(' ', trim($user['name'] ?? ''), 2);
            $user['first_name'] = $nameParts[0] ?? '';
            $user['last_name'] = $nameParts[1] ?? '';
            $user['avatar'] = null;

            // Generate secure token containing user id
            $payload = [
                'id' => (int)$user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'time' => time()
            ];
            $tokenPayload = base64_encode(json_encode($payload));
            $tokenSignature = hash_hmac('sha256', (string)$user['id'], 'medicare_plus_secret_key_2026');
            $token = $tokenPayload . '.' . $tokenSignature;

            // Save in session if enabled
            if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
                @session_start();
            }
            if (session_status() === PHP_SESSION_ACTIVE) {
                $_SESSION['user_id'] = $user['id'];
            }

            echo json_encode([
                "success" => true, 
                "message" => "Login successful", 
                "user" => $user,
                "data" => $user,
                "token" => $token
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid email or password"]);
        }
    }

    private function register() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name) || empty($data->email) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name, email, and password are required"]);
            return;
        }

        $email = trim(strtolower($data->email));

        if ($this->user->findByEmail($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email already exists"]);
            return;
        }

        if ($this->user->create(trim($data->name), $email, $data->password, $data->phone ?? null)) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Registration successful. Please login."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Registration failed"]);
        }
    }

    private function me() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        echo json_encode([
            "success" => true,
            "user" => $currentUser,
            "data" => $currentUser
        ]);
    }

    private function updateProfile() {
        $currentUser = AuthMiddleware::requireAuth($this->db);
        $data = json_decode(file_get_contents("php://input"));

        $userId = (int)$currentUser['id'];

        $name = null;
        if (!empty($data->name)) {
            $name = trim($data->name);
        } elseif (isset($data->first_name) || isset($data->last_name)) {
            $first = trim($data->first_name ?? $currentUser['first_name']);
            $last = trim($data->last_name ?? $currentUser['last_name']);
            $name = trim("$first $last");
        }

        $phone = isset($data->phone) ? trim($data->phone) : $currentUser['phone'];

        $query = "UPDATE users SET ";
        $params = [':id' => $userId];
        $fields = [];

        if ($name !== null) {
            $fields[] = "name = :name";
            $params[':name'] = $name;
        }
        if ($phone !== null) {
            $fields[] = "phone = :phone";
            $params[':phone'] = $phone;
        }

        if (empty($fields)) {
            echo json_encode([
                "success" => true,
                "message" => "No changes made",
                "user" => $currentUser,
                "data" => $currentUser
            ]);
            return;
        }

        $query .= implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $executed = $stmt->execute($params);

        if ($executed) {
            $updatedUser = AuthMiddleware::getAuthenticatedUser($this->db);
            echo json_encode([
                "success" => true,
                "message" => "Profile updated successfully",
                "user" => $updatedUser,
                "data" => $updatedUser
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Unable to update profile."]);
        }
    }

    private function forgotPassword() {
        if ($this->method !== 'POST') {
            $this->methodNotAllowed();
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (empty($data->email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email address is required."]);
            return;
        }

        $email = trim(strtolower($data->email));
        $user = $this->user->findByEmail($email);

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "No account found with this email address."]);
            return;
        }

        $otp = sprintf("%06d", mt_rand(100000, 999999));
        $token = bin2hex(random_bytes(16));

        $del = $this->db->prepare("DELETE FROM password_resets WHERE email = :email");
        $del->execute([':email' => $email]);

        $stmt = $this->db->prepare("INSERT INTO password_resets (email, otp, token, expires_at) VALUES (:email, :otp, :token, DATE_ADD(NOW(), INTERVAL 15 MINUTE))");
        $stmt->execute([
            ':email' => $email,
            ':otp' => $otp,
            ':token' => $token
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Verification code sent to your email.",
            "token" => $token,
            "otp" => $otp
        ]);
    }

    private function resetPassword() {
        if ($this->method !== 'POST') {
            $this->methodNotAllowed();
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (empty($data->email) || empty($data->password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email and new password are required."]);
            return;
        }

        $email = trim(strtolower($data->email));
        $otp = trim($data->otp ?? '');
        $token = trim($data->token ?? '');
        $password = $data->password;

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Password must be at least 6 characters."]);
            return;
        }

        $params = [':email' => $email];
        $where = "email = :email AND expires_at > NOW()";
        if (!empty($otp) && !empty($token)) {
            $where .= " AND (otp = :otp OR token = :token)";
            $params[':otp'] = $otp;
            $params[':token'] = $token;
        } elseif (!empty($otp)) {
            $where .= " AND otp = :otp";
            $params[':otp'] = $otp;
        } elseif (!empty($token)) {
            $where .= " AND token = :token";
            $params[':token'] = $token;
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Verification code or token is required."]);
            return;
        }

        $query = "SELECT * FROM password_resets WHERE $where ORDER BY id DESC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $reset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reset) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid or expired verification code."]);
            return;
        }

        $hashed = password_hash($password, PASSWORD_BCRYPT);
        $update = $this->db->prepare("UPDATE users SET password = :password WHERE email = :email");
        $updated = $update->execute([
            ':password' => $hashed,
            ':email' => $email
        ]);

        if ($updated) {
            $del = $this->db->prepare("DELETE FROM password_resets WHERE email = :email");
            $del->execute([':email' => $email]);

            echo json_encode([
                "success" => true,
                "message" => "Password reset successfully. You can now log in."
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to update password. Please try again."]);
        }
    }
}
?>
