<?php

namespace App\Core\Logging;

use Illuminate\Support\Facades\Log;
use App\Modules\UserManagement\Models\User;
use Carbon\Carbon;

/**
 * Service for logging user activities and system events
 */
class ActivityLogger
{
    private const LOG_CHANNELS = [
        'api' => 'api',
        'inventory' => 'inventory',
        'procurement' => 'procurement',
        'user' => 'single',
        'system' => 'single',
    ];

    /**
     * Log user activity with context
     */
    public function logActivity(
        string $action,
        string $resource,
        ?User $user = null,
        array $context = [],
        string $channel = 'api'
    ): void {
        $logData = [
            'action' => $action,
            'resource' => $resource,
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'user_role' => $user?->role,
            'timestamp' => Carbon::now()->toISOString(),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'context' => $context,
        ];

        $channelName = self::LOG_CHANNELS[$channel] ?? 'single';
        Log::channel($channelName)->info("Activity: {$action} on {$resource}", $logData);
    }

    /**
     * Log inventory operations
     */
    public function logInventoryOperation(
        string $operation,
        string $productSku,
        int $quantity,
        ?User $user = null,
        array $additionalContext = []
    ): void {
        $context = array_merge([
            'product_sku' => $productSku,
            'quantity' => $quantity,
            'operation_type' => 'inventory',
        ], $additionalContext);

        $this->logActivity($operation, 'inventory', $user, $context, 'inventory');
    }

    /**
     * Log procurement operations
     */
    public function logProcurementOperation(
        string $operation,
        string $poNumber,
        ?User $user = null,
        array $additionalContext = []
    ): void {
        $context = array_merge([
            'po_number' => $poNumber,
            'operation_type' => 'procurement',
        ], $additionalContext);

        $this->logActivity($operation, 'procurement', $user, $context, 'procurement');
    }

    /**
     * Log authentication events
     */
    public function logAuthEvent(
        string $event,
        string $email,
        bool $success,
        array $additionalContext = []
    ): void {
        $context = array_merge([
            'email' => $email,
            'success' => $success,
            'event_type' => 'authentication',
        ], $additionalContext);

        $level = $success ? 'info' : 'warning';
        
        Log::channel('api')->{$level}("Auth Event: {$event}", $context);
    }

    /**
     * Log security events
     */
    public function logSecurityEvent(
        string $event,
        string $severity = 'warning',
        ?User $user = null,
        array $context = []
    ): void {
        $logData = array_merge([
            'event_type' => 'security',
            'severity' => $severity,
            'user_id' => $user?->id,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'timestamp' => Carbon::now()->toISOString(),
        ], $context);

        Log::channel('single')->{$severity}("Security Event: {$event}", $logData);
    }

    /**
     * Log business rule violations
     */
    public function logBusinessRuleViolation(
        string $rule,
        string $violation,
        ?User $user = null,
        array $context = []
    ): void {
        $logData = array_merge([
            'rule' => $rule,
            'violation' => $violation,
            'user_id' => $user?->id,
            'event_type' => 'business_rule_violation',
        ], $context);

        $this->logActivity('business_rule_violation', $rule, $user, $logData);
    }

    /**
     * Log system performance metrics
     */
    public function logPerformanceMetric(
        string $operation,
        float $duration,
        array $context = []
    ): void {
        $logData = array_merge([
            'operation' => $operation,
            'duration_ms' => round($duration * 1000, 2),
            'event_type' => 'performance',
            'timestamp' => Carbon::now()->toISOString(),
        ], $context);

        Log::channel('api')->debug("Performance: {$operation}", $logData);
    }

    /**
     * Log data changes with before/after values
     */
    public function logDataChange(
        string $table,
        int $recordId,
        array $changes,
        ?User $user = null,
        string $operation = 'update'
    ): void {
        $context = [
            'table' => $table,
            'record_id' => $recordId,
            'operation' => $operation,
            'changes' => $changes,
            'event_type' => 'data_change',
        ];

        $this->logActivity('data_change', $table, $user, $context);
    }

    /**
     * Log critical business events
     */
    public function logCriticalEvent(
        string $event,
        string $description,
        ?User $user = null,
        array $context = []
    ): void {
        $logData = array_merge([
            'description' => $description,
            'severity' => 'critical',
            'event_type' => 'critical_business_event',
            'requires_attention' => true,
        ], $context);

        $this->logActivity($event, 'system', $user, $logData);

        // Also log as error for immediate attention
        Log::channel('single')->error("Critical Event: {$event} - {$description}", $logData);
    }

    /**
     * Log FEFO violations
     */
    public function logFefoViolation(
        string $productSku,
        string $attemptedBatch,
        string $earlierBatch,
        ?User $user = null
    ): void {
        $context = [
            'product_sku' => $productSku,
            'attempted_batch' => $attemptedBatch,
            'earlier_batch' => $earlierBatch,
            'violation_type' => 'fefo_violation',
        ];

        $this->logBusinessRuleViolation('FEFO', 'Attempted to pick from non-FEFO batch', $user, $context);
    }

    /**
     * Log variance alerts
     */
    public function logVarianceAlert(
        string $productSku,
        int $systemQuantity,
        int $countedQuantity,
        float $variancePercentage,
        ?User $user = null
    ): void {
        $context = [
            'product_sku' => $productSku,
            'system_quantity' => $systemQuantity,
            'counted_quantity' => $countedQuantity,
            'variance_percentage' => $variancePercentage,
            'alert_type' => 'variance_alert',
        ];

        $this->logCriticalEvent(
            'variance_alert',
            "Inventory variance of {$variancePercentage}% detected for {$productSku}",
            $user,
            $context
        );
    }

    /**
     * Get recent activities for a user
     */
    public function getRecentActivities(?User $user = null, int $limit = 50): array
    {
        // This would typically query a dedicated activities table
        // For now, we'll return empty array as this is primarily for logging
        return [];
    }
}