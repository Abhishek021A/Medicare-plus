<?php
// backend/services/NotificationService.php
require_once __DIR__ . '/../config/database.php';

class NotificationService {
    private $db;

    public function __construct($db = null) {
        if ($db) {
            $this->db = $db;
        } else {
            $database = new Database();
            $this->db = $database->getConnection();
        }
    }

    /**
     * Create a notification with duplicate prevention
     */
    public function createNotification($data) {
        if (!$this->db) return false;

        $type = strtoupper($data['type'] ?? 'SYSTEM');
        $title = trim($data['title'] ?? 'Notification');
        $message = trim($data['message'] ?? '');
        $priority = in_array(strtoupper($data['priority'] ?? ''), ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']) 
            ? strtoupper($data['priority']) : 'NORMAL';
        $entityType = !empty($data['entity_type']) ? strtolower($data['entity_type']) : null;
        $entityId = !empty($data['entity_id']) ? (string)$data['entity_id'] : null;
        $actionUrl = $data['action_url'] ?? null;
        $adminId = isset($data['admin_id']) ? (int)$data['admin_id'] : null;
        $metadata = isset($data['metadata']) ? (is_array($data['metadata']) ? json_encode($data['metadata']) : $data['metadata']) : null;

        // Duplicate prevention: check if identical notification exists recently
        if ($entityType && $entityId) {
            $checkSql = "SELECT id FROM notifications 
                         WHERE type = :type 
                           AND entity_type = :entity_type 
                           AND entity_id = :entity_id 
                           AND deleted_at IS NULL";
            
            // For inventory, don't spam if alert was created within 24h
            if ($type === 'INVENTORY') {
                $checkSql .= " AND created_at >= (NOW() - INTERVAL 24 HOUR)";
            } elseif ($type === 'ORDER' || $type === 'PRESCRIPTION' || $type === 'REVIEW') {
                // For order / prescription creation, only create once per entity
                $checkSql .= " AND title = :title";
            } else {
                $checkSql .= " AND created_at >= (NOW() - INTERVAL 1 HOUR)";
            }

            try {
                $checkStmt = $this->db->prepare($checkSql);
                $params = [
                    ':type' => $type,
                    ':entity_type' => $entityType,
                    ':entity_id' => $entityId
                ];
                if ($type === 'ORDER' || $type === 'PRESCRIPTION' || $type === 'REVIEW') {
                    $params[':title'] = $title;
                }
                $checkStmt->execute($params);
                if ($checkStmt->fetch()) {
                    // Duplicate found, avoid spam
                    return false;
                }
            } catch (Exception $e) {
                // If checking fails, proceed to attempt insert
            }
        }

        try {
            $sql = "INSERT INTO notifications (admin_id, type, title, message, priority, entity_type, entity_id, action_url, metadata, is_read, created_at)
                    VALUES (:admin_id, :type, :title, :message, :priority, :entity_type, :entity_id, :action_url, :metadata, 0, NOW())";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':admin_id' => $adminId,
                ':type' => $type,
                ':title' => $title,
                ':message' => $message,
                ':priority' => $priority,
                ':entity_type' => $entityType,
                ':entity_id' => $entityId,
                ':action_url' => $actionUrl,
                ':metadata' => $metadata
            ]);
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            error_log("Failed to create notification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Trigger for New Order Received
     */
    public function notifyOrderCreated($orderId, $orderNumber, $customerName, $totalAmount) {
        $formattedAmount = '₹' . number_format($totalAmount, 2);
        return $this->createNotification([
            'type' => 'ORDER',
            'title' => 'New Order Received',
            'message' => "Order #{$orderNumber} was placed by {$customerName} for {$formattedAmount}.",
            'priority' => 'NORMAL',
            'entity_type' => 'order',
            'entity_id' => (string)$orderId,
            'action_url' => '/admin/orders',
            'metadata' => [
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'customer_name' => $customerName,
                'total_amount' => $totalAmount
            ]
        ]);
    }

    /**
     * Trigger for Order Status Changed
     */
    public function notifyOrderStatusChanged($orderId, $orderNumber, $oldStatus, $newStatus) {
        if ($oldStatus === $newStatus) return false;
        return $this->createNotification([
            'type' => 'ORDER',
            'title' => 'Order Status Updated',
            'message' => "Order #{$orderNumber} status changed from {$oldStatus} to {$newStatus}.",
            'priority' => ($newStatus === 'CANCELLED') ? 'HIGH' : 'NORMAL',
            'entity_type' => 'order',
            'entity_id' => (string)$orderId,
            'action_url' => '/admin/orders',
            'metadata' => [
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]
        ]);
    }

    /**
     * Trigger for Prescription Uploaded / Awaiting Review
     */
    public function notifyPrescriptionUploaded($prescriptionId, $rxNumber, $customerName) {
        return $this->createNotification([
            'type' => 'PRESCRIPTION',
            'title' => 'Prescription Awaiting Review',
            'message' => "Prescription #{$rxNumber} submitted by {$customerName} requires pharmacist verification.",
            'priority' => 'HIGH',
            'entity_type' => 'prescription',
            'entity_id' => (string)$prescriptionId,
            'action_url' => '/admin/prescriptions',
            'metadata' => [
                'prescription_id' => $prescriptionId,
                'prescription_number' => $rxNumber,
                'customer_name' => $customerName
            ]
        ]);
    }

    /**
     * Trigger for Product Review Submitted
     */
    public function notifyReviewSubmitted($reviewId, $productName, $rating, $customerName) {
        return $this->createNotification([
            'type' => 'REVIEW',
            'title' => 'New Product Review',
            'message' => "{$customerName} submitted a {$rating}-star review on {$productName}.",
            'priority' => ($rating <= 2) ? 'HIGH' : 'NORMAL',
            'entity_type' => 'review',
            'entity_id' => (string)$reviewId,
            'action_url' => '/admin/reviews',
            'metadata' => [
                'review_id' => $reviewId,
                'product_name' => $productName,
                'rating' => $rating,
                'customer_name' => $customerName
            ]
        ]);
    }

    /**
     * Trigger for Low Stock Alert (triggered on transition)
     */
    public function notifyLowStock($productId, $productName, $currentStock, $threshold, $sku = '') {
        return $this->createNotification([
            'type' => 'INVENTORY',
            'title' => 'Low Stock Alert',
            'message' => "{$productName}" . ($sku ? " (SKU: {$sku})" : "") . " has only {$currentStock} units remaining (Threshold: {$threshold}).",
            'priority' => 'HIGH',
            'entity_type' => 'product',
            'entity_id' => (string)$productId,
            'action_url' => '/admin/inventory',
            'metadata' => [
                'product_id' => $productId,
                'product_name' => $productName,
                'sku' => $sku,
                'stock_quantity' => $currentStock,
                'threshold' => $threshold
            ]
        ]);
    }

    /**
     * Trigger for Out of Stock
     */
    public function notifyOutOfStock($productId, $productName, $sku = '') {
        return $this->createNotification([
            'type' => 'INVENTORY',
            'title' => 'Product Out of Stock',
            'message' => "{$productName}" . ($sku ? " (SKU: {$sku})" : "") . " is completely out of stock!",
            'priority' => 'CRITICAL',
            'entity_type' => 'product',
            'entity_id' => (string)$productId,
            'action_url' => '/admin/inventory',
            'metadata' => [
                'product_id' => $productId,
                'product_name' => $productName,
                'sku' => $sku,
                'stock_quantity' => 0
            ]
        ]);
    }

    /**
     * Trigger for Customer Registration
     */
    public function notifyCustomerRegistered($customerId, $customerName, $email) {
        return $this->createNotification([
            'type' => 'CUSTOMER',
            'title' => 'New Customer Registered',
            'message' => "Customer {$customerName} ({$email}) created an account.",
            'priority' => 'LOW',
            'entity_type' => 'customer',
            'entity_id' => (string)$customerId,
            'action_url' => '/admin/customers',
            'metadata' => [
                'customer_id' => $customerId,
                'customer_name' => $customerName,
                'customer_email' => $email
            ]
        ]);
    }

    /**
     * Trigger for Payment Event
     */
    public function notifyPaymentReceived($orderId, $orderNumber, $amount, $method) {
        $formattedAmount = '₹' . number_format($amount, 2);
        return $this->createNotification([
            'type' => 'PAYMENT',
            'title' => 'Payment Successful',
            'message' => "Payment of {$formattedAmount} via {$method} confirmed for order #{$orderNumber}.",
            'priority' => 'NORMAL',
            'entity_type' => 'order',
            'entity_id' => (string)$orderId,
            'action_url' => '/admin/orders',
            'metadata' => [
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'amount' => $amount,
                'method' => $method
            ]
        ]);
    }
}
