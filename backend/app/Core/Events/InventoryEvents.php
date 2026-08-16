<?php

namespace App\Core\Events;

/**
 * Inventory-related events
 */

class StockReceived extends BaseEvent
{
    public function __construct(
        public int $productId,
        public int $quantity,
        public ?int $batchId = null,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'product_id' => $productId,
            'quantity' => $quantity,
            'batch_id' => $batchId,
        ]));
    }

    public function getEventName(): string
    {
        return 'stock.received';
    }
}

class StockIssued extends BaseEvent
{
    public function __construct(
        public int $productId,
        public int $quantity,
        public ?int $batchId = null,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'product_id' => $productId,
            'quantity' => $quantity,
            'batch_id' => $batchId,
        ]));
    }

    public function getEventName(): string
    {
        return 'stock.issued';
    }
}

class LowStockDetected extends BaseEvent
{
    public function __construct(
        public int $productId,
        public int $currentStock,
        public int $reorderLevel,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'product_id' => $productId,
            'current_stock' => $currentStock,
            'reorder_level' => $reorderLevel,
        ]));
    }

    public function getEventName(): string
    {
        return 'stock.low_stock_detected';
    }
}

class VarianceDetected extends BaseEvent
{
    public function __construct(
        public int $productId,
        public int $systemQuantity,
        public int $countedQuantity,
        public float $variancePercentage,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'product_id' => $productId,
            'system_quantity' => $systemQuantity,
            'counted_quantity' => $countedQuantity,
            'variance_percentage' => $variancePercentage,
        ]));
    }

    public function getEventName(): string
    {
        return 'inventory.variance_detected';
    }
}

class BatchExpiring extends BaseEvent
{
    public function __construct(
        public int $batchId,
        public int $productId,
        public int $daysToExpiry,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'batch_id' => $batchId,
            'product_id' => $productId,
            'days_to_expiry' => $daysToExpiry,
        ]));
    }

    public function getEventName(): string
    {
        return 'batch.expiring';
    }
}

class BatchExpired extends BaseEvent
{
    public function __construct(
        public int $batchId,
        public int $productId,
        public int $quantity,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'batch_id' => $batchId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]));
    }

    public function getEventName(): string
    {
        return 'batch.expired';
    }
}

class FefoViolationAttempted extends BaseEvent
{
    public function __construct(
        public int $productId,
        public int $attemptedBatchId,
        public int $earlierBatchId,
        ?int $userId = null,
        array $context = []
    ) {
        parent::__construct($userId, array_merge($context, [
            'product_id' => $productId,
            'attempted_batch_id' => $attemptedBatchId,
            'earlier_batch_id' => $earlierBatchId,
        ]));
    }

    public function getEventName(): string
    {
        return 'inventory.fefo_violation_attempted';
    }
}