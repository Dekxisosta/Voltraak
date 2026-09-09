<?php

namespace App\Core\Notifications;

use Illuminate\Support\Facades\Log;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\UserRole;
use Carbon\Carbon;

/**
 * Service for managing system notifications and alerts
 */
class NotificationService
{
    private const NOTIFICATION_TYPES = [
        'low_stock' => [
            'title' => 'Low Stock Alert',
            'priority' => 'high',
            'roles' => [UserRole::INVENTORY->value, UserRole::MANAGER->value],
        ],
        'expiry_warning' => [
            'title' => 'Expiry Warning',
            'priority' => 'medium',
            'roles' => [UserRole::INVENTORY->value, UserRole::MANAGER->value],
        ],
        'variance_alert' => [
            'title' => 'Variance Alert',
            'priority' => 'high',
            'roles' => [UserRole::INVENTORY->value, UserRole::MANAGER->value],
        ],
        'fefo_violation' => [
            'title' => 'FEFO Violation',
            'priority' => 'high',
            'roles' => [UserRole::WAREHOUSE->value, UserRole::INVENTORY->value, UserRole::MANAGER->value],
        ],
        'po_approval' => [
            'title' => 'Purchase Order Approval Required',
            'priority' => 'medium',
            'roles' => [UserRole::MANAGER->value],
        ],
        'system_alert' => [
            'title' => 'System Alert',
            'priority' => 'high',
            'roles' => [UserRole::MANAGER->value],
        ],
    ];

    /**
     * Send notification to specific users
     */
    public function sendNotification(
        string $type,
        string $message,
        array $userIds = [],
        array $data = []
    ): array {
        $notificationConfig = self::NOTIFICATION_TYPES[$type] ?? null;
        
        if (!$notificationConfig) {
            throw new \InvalidArgumentException("Unknown notification type: {$type}");
        }

        $notification = [
            'id' => uniqid('notif_'),
            'type' => $type,
            'title' => $notificationConfig['title'],
            'message' => $message,
            'priority' => $notificationConfig['priority'],
            'data' => $data,
            'created_at' => Carbon::now()->toISOString(),
            'read' => false,
        ];

        // If no specific users provided, send to all users with appropriate roles
        if (empty($userIds)) {
            $users = User::whereIn('role', $notificationConfig['roles'])
                         ->where('is_active', true)
                         ->get();
            $userIds = $users->pluck('id')->toArray();
        }

        // In a real implementation, this would store notifications in database
        // For now, we'll log them and return the notification data
        Log::channel('api')->info('Notification sent', [
            'notification' => $notification,
            'user_ids' => $userIds,
        ]);

        return $notification;
    }

    /**
     * Send low stock alert
     */
    public function sendLowStockAlert(string $productName, string $sku, int $currentStock, int $reorderLevel): array
    {
        $message = "Product '{$productName}' ({$sku}) is below reorder level. Current: {$currentStock}, Reorder Level: {$reorderLevel}";
        
        return $this->sendNotification('low_stock', $message, [], [
            'product_name' => $productName,
            'sku' => $sku,
            'current_stock' => $currentStock,
            'reorder_level' => $reorderLevel,
        ]);
    }

    /**
     * Send expiry warning notification
     */
    public function sendExpiryWarning(string $productName, string $batchNumber, Carbon $expiryDate): array
    {
        $daysToExpiry = $expiryDate->diffInDays(Carbon::now());
        $message = "Batch '{$batchNumber}' of '{$productName}' expires in {$daysToExpiry} days ({$expiryDate->format('Y-m-d')})";
        
        return $this->sendNotification('expiry_warning', $message, [], [
            'product_name' => $productName,
            'batch_number' => $batchNumber,
            'expiry_date' => $expiryDate->toISOString(),
            'days_to_expiry' => $daysToExpiry,
        ]);
    }

    /**
     * Send variance alert notification
     */
    public function sendVarianceAlert(
        string $productName,
        string $sku,
        int $systemQuantity,
        int $countedQuantity,
        float $variancePercentage
    ): array {
        $variance = $countedQuantity - $systemQuantity;
        $message = "Inventory variance detected for '{$productName}' ({$sku}). System: {$systemQuantity}, Counted: {$countedQuantity}, Variance: {$variance} ({$variancePercentage}%)";
        
        return $this->sendNotification('variance_alert', $message, [], [
            'product_name' => $productName,
            'sku' => $sku,
            'system_quantity' => $systemQuantity,
            'counted_quantity' => $countedQuantity,
            'variance' => $variance,
            'variance_percentage' => $variancePercentage,
        ]);
    }

    /**
     * Send FEFO violation alert
     */
    public function sendFefoViolation(
        string $productName,
        string $attemptedBatch,
        string $earlierBatch,
        ?User $user = null
    ): array {
        $userName = $user ? $user->name : 'Unknown User';
        $message = "FEFO violation: {$userName} attempted to pick from batch '{$attemptedBatch}' while earlier batch '{$earlierBatch}' is available for '{$productName}'";
        
        return $this->sendNotification('fefo_violation', $message, [], [
            'product_name' => $productName,
            'attempted_batch' => $attemptedBatch,
            'earlier_batch' => $earlierBatch,
            'user_name' => $userName,
            'user_id' => $user?->id,
        ]);
    }

    /**
     * Send purchase order approval notification
     */
    public function sendPoApprovalRequest(string $poNumber, string $supplierName, float $totalAmount): array
    {
        $message = "Purchase Order {$poNumber} for {$supplierName} (₱" . number_format($totalAmount, 2) . ") requires approval";
        
        return $this->sendNotification('po_approval', $message, [], [
            'po_number' => $poNumber,
            'supplier_name' => $supplierName,
            'total_amount' => $totalAmount,
        ]);
    }

    /**
     * Send system alert
     */
    public function sendSystemAlert(string $message, string $severity = 'warning', array $data = []): array
    {
        return $this->sendNotification('system_alert', $message, [], array_merge([
            'severity' => $severity,
        ], $data));
    }

    /**
     * Get notifications for user
     */
    public function getUserNotifications(User $user, bool $unreadOnly = false): array
    {
        // In a real implementation, this would query notifications from database
        // For now, return empty array as this is a basic implementation
        return [];
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(string $notificationId, User $user): bool
    {
        // In a real implementation, this would update notification in database
        Log::channel('api')->info('Notification marked as read', [
            'notification_id' => $notificationId,
            'user_id' => $user->id,
        ]);
        
        return true;
    }

    /**
     * Get notification statistics for user
     */
    public function getNotificationStats(User $user): array
    {
        return [
            'total' => 0,
            'unread' => 0,
            'high_priority_unread' => 0,
            'types' => [
                'low_stock' => 0,
                'expiry_warning' => 0,
                'variance_alert' => 0,
                'fefo_violation' => 0,
                'po_approval' => 0,
                'system_alert' => 0,
            ],
        ];
    }

    /**
     * Send bulk notifications to role-based groups
     */
    public function sendBulkNotification(
        string $type,
        string $message,
        array $roles = [],
        array $data = []
    ): array {
        $notificationConfig = self::NOTIFICATION_TYPES[$type] ?? null;
        
        if (!$notificationConfig) {
            throw new \InvalidArgumentException("Unknown notification type: {$type}");
        }

        // Use provided roles or default to notification type roles
        $targetRoles = !empty($roles) ? $roles : $notificationConfig['roles'];
        
        $users = User::whereIn('role', $targetRoles)
                     ->where('is_active', true)
                     ->get();

        return $this->sendNotification($type, $message, $users->pluck('id')->toArray(), $data);
    }

    /**
     * Clear old notifications
     */
    public function clearOldNotifications(int $daysOld = 30): int
    {
        // In a real implementation, this would delete old notifications from database
        Log::channel('api')->info('Old notifications cleanup', [
            'days_old' => $daysOld,
            'action' => 'cleanup_triggered',
        ]);
        
        return 0; // Return count of deleted notifications
    }
}