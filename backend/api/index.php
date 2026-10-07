<?php
// backend/api/index.php

// CORS Headers
header("Access-Control-Allow-Origin: *"); // For dev, allow all. In prod, specify the domain
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,PATCH,DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple Router
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// For a local dev environment without rewrite rules, you might need to handle the base path.
// Assuming the API is accessed via /pharmacy-api/api/ (or similar), we want to extract the relative path.
// Let's make it robust by getting the path relative to index.php.
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g. /backend/api/index.php
$baseDir = dirname($scriptName); // e.g. /backend/api

if (strpos($uri, $scriptName) === 0) {
    $uri = substr($uri, strlen($scriptName));
} elseif (strpos($uri, $baseDir) === 0) {
    $uri = substr($uri, strlen($baseDir));
}
$uri = trim($uri, '/');

$uriParts = explode('/', $uri);
$resource = $uriParts[0] ?? '';
$id = $uriParts[1] ?? null;

// Allow /admin/{resource}/... routing
if ($resource === 'admin') {
    array_shift($uriParts);
    $resource = $uriParts[0] ?? '';
    $id = $uriParts[1] ?? null;
}

$method = $_SERVER["REQUEST_METHOD"];

// Route handling
switch ($resource) {
    case 'products':
        if (isset($uriParts[2]) && $uriParts[2] === 'reviews') {
            require_once '../controllers/ReviewController.php';
            $controller = new ReviewController($method, $uriParts[1], 'reviews');
            $controller->processRequest();
            break;
        }
        require_once '../controllers/ProductController.php';
        $controller = new ProductController($method, $id);
        $controller->processRequest();
        break;
    case 'categories':
        require_once '../controllers/CategoryController.php';
        $controller = new CategoryController($method, $id);
        $controller->processRequest();
        break;
    case 'subcategories':
        require_once '../controllers/CategoryController.php';
        $controller = new CategoryController($method, $id, 'subcategories');
        $controller->processRequest();
        break;
    case 'brands':
        require_once '../controllers/BrandController.php';
        $controller = new BrandController($method, $id);
        $controller->processRequest();
        break;
    case 'auth':
        require_once '../controllers/AuthController.php';
        $action = $uriParts[1] ?? '';
        $controller = new AuthController($method, $action);
        $controller->processRequest();
        break;
    case 'location':
        require_once '../controllers/LocationController.php';
        $controller = new LocationController($method);
        $controller->processRequest();
        break;
    case 'stats':
        require_once '../controllers/StatsController.php';
        $controller = new StatsController($method);
        $controller->processRequest();
        break;
    case 'inventory':
        require_once '../controllers/InventoryController.php';
        $action = $uriParts[1] ?? null;
        $id = $uriParts[2] ?? null;
        $controller = new InventoryController($method, $action, $id);
        $controller->processRequest();
        break;
    case 'orders':
        require_once '../controllers/OrderController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new OrderController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'prescriptions':
        require_once '../controllers/PrescriptionController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new PrescriptionController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'addresses':
        require_once '../controllers/AddressController.php';
        $controller = new AddressController($method, $id);
        $controller->processRequest();
        break;
    case 'wishlist':
        require_once '../controllers/WishlistController.php';
        $controller = new WishlistController($method, $id);
        $controller->processRequest();
        break;
    case 'customers':
        require_once '../controllers/CustomerController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new CustomerController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'coupons':
        require_once '../controllers/CouponController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new CouponController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'banners':
        require_once '../controllers/BannerController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new BannerController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'blog':
    case 'blogs':
        require_once '../controllers/BlogController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new BlogController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'reviews':
        require_once '../controllers/ReviewController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new ReviewController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'reports':
        require_once '../controllers/ReportController.php';
        $controller = new ReportController($method, $id);
        $controller->processRequest();
        break;
    case 'notifications':
    case 'notification':
        require_once '../controllers/NotificationController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new NotificationController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'managers':
    case 'manager':
        require_once '../controllers/ManagerController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new ManagerController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'settings':
    case 'setting':
        require_once '../controllers/SettingsController.php';
        $subAction = $uriParts[2] ?? null;
        $controller = new SettingsController($method, $id, $subAction);
        $controller->processRequest();
        break;
    case 'profile':
    case 'admin-profile':
        require_once '../controllers/AdminProfileController.php';
        $subAction = $id; // e.g. 'password', 'avatar', 'activity'
        $controller = new AdminProfileController($method, $subAction);
        $controller->processRequest();
        break;
    case 'user':
        require_once '../controllers/AuthController.php';
        $action = $uriParts[1] ?? 'profile';
        $controller = new AuthController($method, $action);
        $controller->processRequest();
        break;
    default:
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Endpoint not found"]);
        break;
}
?>
