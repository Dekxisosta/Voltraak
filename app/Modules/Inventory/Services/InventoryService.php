<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Models\StockTransaction;
use App\Models\User;
use App\Support\Enums\StockTransactionType;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use App\Core\Events\InventoryEvents;
use App\Core\Exceptions\ConflictException;
use App\Core\Exceptions\ValidationException;
use App\Core\Exceptions\ResourceNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Core inventory management service
 */
class InventoryService
{
    public function __construct(
        private ActivityLogger $activityLogger,
        private NotificationService $notificationService,
        private FEFOService $fefoService
    ) {}

    /**
     * Receive stock into inventory
     */
    public function receiveStock(array $data, User $user): StockTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            $quantityBefore = $product->quantity;

            // Create or find batch
            $batch = null;
            if (isset($data['batch_data'])) {
                $batch = $this->createOrUpdateBatch($product, $data['batch_data'], $data['quantity']);
            }

            // Update product quantity
            $product->updateStock($data['quantity'], 'add');
            $quantityAfter = $product->quantity;

            // Create stock transaction
            $transaction = StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $batch?->id,
                'user_id' => $user->id,
                'type' => StockTransactionType::IN,
                'quantity' => $data['quantity'],
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'unit_cost' => $data['unit_cost'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_received',
                $product->sku,
                $data['quantity'],
                $user,
                ['batch_id' => $batch?->id, 'transaction_id' => $transaction->id]
            );

            // Fire event
            event(new InventoryEvents\StockReceived(
                $product->id,
                $data['quantity'],
                $batch?->id,
                $user->id
            ));

            return $transaction;
        });
    }

    /**
     * Issue stock from inventory with FEFO enforcement
     */
    public function issueStock(array $data, User $user): StockTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            
            // Check sufficient quantity
            if (!$product->hasSufficientQuantity($data['quantity'])) {
                throw ConflictException::insufficientInventory(
                    $product->available_quantity,
                    $data['quantity'],
                    $product->sku
                );
            }

            $quantityBefore = $product->quantity;

            // Get batch using FEFO if not specified
            $batch = null;
            if (isset($data['batch_id'])) {
                $batch = Batch::findOrFail($data['batch_id']);
                
                // Validate FEFO compliance
                if (!$this->fefoService->validateFefoCompliance($batch, $data['quantity'])) {
                    $earlierBatch = $this->fefoService->getEarlierAvailableBatch($product);
                    throw ConflictException::fefoViolation($batch->id, $earlierBatch?->id);
                }
            } else {
                $batch = $this->fefoService->selectBatchForPick($product, $data['quantity']);
                
                if (!$batch) {
                    throw ConflictException::insufficientInventory(0, $data['quantity'], $product->sku);
                }
            }

            // Reduce batch quantity
            if (!$batch->reduceQuantity($data['quantity'])) {
                throw ConflictException::insufficientInventory(
                    $batch->quantity,
                    $data['quantity'],
                    $product->sku
                );
            }

            // Update product quantity
            $product->updateStock($data['quantity'], 'subtract');
            $quantityAfter = $product->quantity;

            // Create stock transaction
            $transaction = StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $batch->id,
                'user_id' => $user->id,
                'type' => StockTransactionType::OUT,
                'quantity' => $data['quantity'],
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'unit_cost' => $batch->unit_cost ?? $product->unit_price,
                'reference_number' => $data['reference_number'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_issued',
                $product->sku,
                $data['quantity'],
                $user,
                ['batch_id' => $batch->id, 'transaction_id' => $transaction->id]
            );

            // Check for low stock alert
            if ($product->isLowStock()) {
                $this->notificationService->sendLowStockAlert(
                    $product->name,
                    $product->sku,
                    $product->quantity,
                    $product->reorder_level
                );

                event(new InventoryEvents\LowStockDetected(
                    $product->id,
                    $product->quantity,
                    $product->reorder_level,
                    $user->id
                ));
            }

            // Fire event
            event(new InventoryEvents\StockIssued(
                $product->id,
                $data['quantity'],
                $batch->id,
                $user->id
            ));

            return $transaction;
        });
    }

    /**
     * Transfer stock between locations
     */
    public function transferStock(array $data, User $user): StockTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            $quantityBefore = $product->quantity;

            // Create stock transaction
            $transaction = StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $data['batch_id'] ?? null,
                'user_id' => $user->id,
                'type' => StockTransactionType::TRANSFER,
                'quantity' => $data['quantity'],
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityBefore, // No quantity change in transfers
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update storage location if provided
            if (isset($data['new_storage_bin'])) {
                $product->storage_bin = $data['new_storage_bin'];
                $product->save();
            }

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_transferred',
                $product->sku,
                $data['quantity'],
                $user,
                ['transaction_id' => $transaction->id, 'new_location' => $data['new_storage_bin'] ?? null]
            );

            return $transaction;
        });
    }

    /**
     * Adjust stock quantity
     */
    public function adjustStock(array $data, User $user): StockTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            $quantityBefore = $product->quantity;
            
            $adjustmentQuantity = $data['adjustment_quantity'];
            $newQuantity = max(0, $quantityBefore + $adjustmentQuantity);
            
            // Update product quantity
            $product->quantity = $newQuantity;
            $product->save();

            // Create stock transaction
            $transaction = StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $data['batch_id'] ?? null,
                'user_id' => $user->id,
                'type' => StockTransactionType::ADJUSTMENT,
                'quantity' => abs($adjustmentQuantity),
                'quantity_before' => $quantityBefore,
                'quantity_after' => $newQuantity,
                'reference_number' => $data['reference_number'] ?? null,
                'reference_type' => $data['reference_type'] ?? 'manual_adjustment',
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? 'Manual stock adjustment',
            ]);

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_adjusted',
                $product->sku,
                abs($adjustmentQuantity),
                $user,
                [
                    'adjustment_type' => $adjustmentQuantity > 0 ? 'increase' : 'decrease',
                    'quantity_before' => $quantityBefore,
                    'quantity_after' => $newQuantity,
                    'transaction_id' => $transaction->id
                ]
            );

            return $transaction;
        });
    }

    /**
     * Create or update batch
     */
    public function createOrUpdateBatch(Product $product, array $batchData, int $additionalQuantity = 0): Batch
    {
        $existingBatch = null;
        
        if (isset($batchData['batch_number'])) {
            $existingBatch = Batch::where('product_id', $product->id)
                ->where('batch_number', $batchData['batch_number'])
                ->first();
        }

        if ($existingBatch) {
            // Update existing batch quantity
            $existingBatch->increaseQuantity($additionalQuantity);
            return $existingBatch;
        }

        // Create new batch
        return Batch::create([
            'product_id' => $product->id,
            'batch_number' => $batchData['batch_number'] ?? $this->generateBatchNumber($product),
            'quantity' => $batchData['quantity'] ?? $additionalQuantity,
            'received_quantity' => $batchData['quantity'] ?? $additionalQuantity,
            'manufacture_date' => $batchData['manufacture_date'] ?? null,
            'expiry_date' => $batchData['expiry_date'] ?? null,
            'unit_cost' => $batchData['unit_cost'] ?? null,
            'supplier_batch_number' => $batchData['supplier_batch_number'] ?? null,
            'notes' => $batchData['notes'] ?? null,
        ]);
    }

    /**
     * Generate unique batch number
     */
    public function generateBatchNumber(Product $product): string
    {
        $prefix = 'BTH';
        $productCode = substr($product->sku, 0, 3);
        $date = now()->format('Ymd');
        $counter = Batch::where('product_id', $product->id)->count() + 1;
        
        return sprintf('%s-%s-%s-%04d', $prefix, $productCode, $date, $counter);
    }

    /**
     * Get inventory summary
     */
    public function getInventorySummary(): array
    {
        return [
            'total_products' => Product::active()->count(),
            'total_stock_value' => Product::active()->sum(DB::raw('quantity * unit_price')),
            'low_stock_products' => Product::active()->lowStock()->count(),
            'out_of_stock_products' => Product::active()->outOfStock()->count(),
            'expiring_batches' => Batch::warning()->count(),
            'expired_batches' => Batch::expired()->count(),
            'total_batches' => Batch::active()->count(),
        ];
    }

    /**
     * Get stock movement summary for period
     */
    public function getStockMovementSummary(int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $transactions = StockTransaction::where('transaction_date', '>=', $startDate)->get();
        
        return [
            'period_days' => $days,
            'total_transactions' => $transactions->count(),
            'total_stock_in' => $transactions->where('type', StockTransactionType::IN->value)->sum('quantity'),
            'total_stock_out' => $transactions->where('type', StockTransactionType::OUT->value)->sum('quantity'),
            'total_transfers' => $transactions->where('type', StockTransactionType::TRANSFER->value)->count(),
            'total_adjustments' => $transactions->where('type', StockTransactionType::ADJUSTMENT->value)->count(),
            'net_movement' => $transactions->sum(function ($transaction) {
                return $transaction->increasesStock() ? $transaction->quantity : -$transaction->quantity;
            }),
            'daily_averages' => [
                'transactions_per_day' => round($transactions->count() / max(1, $days), 2),
                'stock_in_per_day' => round($transactions->where('type', StockTransactionType::IN->value)->sum('quantity') / max(1, $days), 2),
                'stock_out_per_day' => round($transactions->where('type', StockTransactionType::OUT->value)->sum('quantity') / max(1, $days), 2),
            ]
        ];
    }

    /**
     * Get products requiring attention
     */
    public function getProductsRequiringAttention(): array
    {
        return [
            'low_stock' => Product::active()->lowStock()->with('batches')->get(),
            'out_of_stock' => Product::active()->outOfStock()->get(),
            'expiring_batches' => Batch::warning()->with('product')->get(),
            'expired_batches' => Batch::expired()->with('product')->get(),
        ];
    }

    /**
     * Process expired batches
     */
    public function processExpiredBatches(): array
    {
        $expiredBatches = Batch::where('expiry_date', '<', now())
            ->where('status', '!=', 'expired')
            ->get();

        $processed = [];
        
        foreach ($expiredBatches as $batch) {
            $batch->updateStatus(); // This will set status to expired
            
            // Fire expiry event
            event(new InventoryEvents\BatchExpired(
                $batch->id,
                $batch->product_id,
                $batch->quantity
            ));
            
            $processed[] = $batch;
        }

        return $processed;
    }

    /**
     * Check and alert for expiring batches
     */
    public function checkExpiringBatches(int $warningDays = null): array
    {
        $warningDays = $warningDays ?? config('ims.expiry.warning_days', 60);
        
        $expiringBatches = Batch::expiringWithin($warningDays)
            ->with('product')
            ->get();

        foreach ($expiringBatches as $batch) {
            // Update status if needed
            $batch->updateStatus();
            
            // Send notification
            $this->notificationService->sendExpiryWarning(
                $batch->product->name,
                $batch->batch_number,
                $batch->expiry_date
            );
            
            // Fire event
            event(new InventoryEvents\BatchExpiring(
                $batch->id,
                $batch->product_id,
                $batch->days_to_expiry
            ));
        }

        return $expiringBatches->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | Controller-facing convenience wrappers
    |--------------------------------------------------------------------------
    |
    | These methods adapt the validated request payloads produced by
    | StockTransactionController, ProductController, PhysicalCountController
    | and BatchController onto the core receiveStock()/issueStock() logic
    | and the correct Eloquent models/columns.
    |
    */

    /**
     * Record a stock-in transaction from validated StoreStockInRequest data.
     */
    public function recordStockIn(array $data): StockTransaction
    {
        $user = User::findOrFail($data['user_id']);

        if (!empty($data['batch_number']) || (!empty($data['create_batch']))) {
            $data['batch_data'] = [
                'batch_number' => $data['batch_number'] ?? null,
                'quantity' => $data['quantity'],
                'received_quantity' => $data['quantity'],
                'manufacture_date' => $data['manufacture_date'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'unit_cost' => $data['unit_cost'] ?? null,
            ];
        }

        return $this->receiveStock($data, $user);
    }

    /**
     * Record a stock-out transaction from validated StoreStockOutRequest data.
     *
     * Returns an array of transactions (one per batch actually depleted,
     * since a single stock-out request may draw from multiple FEFO batches
     * when specific_batches isn't provided).
     */
    public function recordStockOut(array $data): array
    {
        $user = User::findOrFail($data['user_id']);
        $transactions = [];

        if (!empty($data['specific_batches'])) {
            foreach ($data['specific_batches'] as $allocation) {
                $transactions[] = $this->issueStock([
                    'product_id' => $data['product_id'],
                    'batch_id' => $allocation['batch_id'],
                    'quantity' => $allocation['quantity'],
                    'reference_number' => $data['reference_number'] ?? null,
                    'reference_type' => $data['reference_type'] ?? null,
                    'reference_id' => $data['reference_id'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ], $user);
            }
        } else {
            // Let FEFO selection pick the batch automatically.
            $transactions[] = $this->issueStock([
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'reference_number' => $data['reference_number'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ], $user);
        }

        return $transactions;
    }

    /**
     * Reverse a previous stock transaction by creating the inverse movement.
     */
    public function reverseTransaction(StockTransaction $transaction): StockTransaction
    {
        return DB::transaction(function () use ($transaction) {
            $product = Product::findOrFail($transaction->product_id);
            $quantityBefore = $product->quantity;

            // Reverse the stock effect: if the original increased stock,
            // the reversal decreases it, and vice versa.
            $reversesIncrease = $transaction->increasesStock();
            $product->updateStock($transaction->quantity, $reversesIncrease ? 'subtract' : 'add');
            $quantityAfter = $product->quantity;

            if ($transaction->batch_id) {
                $batch = Batch::find($transaction->batch_id);
                if ($batch) {
                    if ($reversesIncrease) {
                        $batch->reduceQuantity($transaction->quantity);
                    } else {
                        $batch->increaseQuantity($transaction->quantity);
                    }
                }
            }

            $reversal = StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $transaction->batch_id,
                'user_id' => $transaction->user_id,
                'type' => StockTransactionType::ADJUSTMENT,
                'quantity' => $transaction->quantity,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'unit_cost' => $transaction->unit_cost,
                'reference_type' => 'transaction_reversal',
                'reference_id' => $transaction->id,
                'notes' => "Reversal of transaction #{$transaction->id}",
            ]);

            return $reversal;
        });
    }

    /**
     * Get current stock level details for a product.
     */
    public function getProductStockLevels(Product $product): array
    {
        return [
            'product_id' => $product->id,
            'sku' => $product->sku,
            'quantity' => $product->quantity,
            'available_quantity' => $product->available_quantity,
            'reorder_level' => $product->reorder_level,
            'max_stock_level' => $product->max_stock_level,
            'stock_status' => $product->stock_status,
            'is_low_stock' => $product->isLowStock(),
            'is_out_of_stock' => $product->isOutOfStock(),
            'batches' => $product->batches()->usable()->fefoOrder()->get()->map(function (Batch $batch) {
                return [
                    'batch_id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'quantity' => $batch->quantity,
                    'available_quantity' => $batch->available_quantity,
                    'expiry_date' => $batch->expiry_date?->toDateString(),
                ];
            })->values(),
        ];
    }

    /**
     * Record a physical count for a product and calculate its variance.
     */
    public function recordPhysicalCount(array $data): PhysicalCount
    {
        $product = Product::findOrFail($data['product_id']);

        return PhysicalCount::create([
            'product_id' => $product->id,
            'counted_by' => $data['counted_by'],
            'system_quantity' => $data['system_quantity'] ?? $product->quantity,
            'counted_quantity' => $data['counted_quantity'],
            'count_reference' => $data['count_reference'] ?? null,
            'count_date' => $data['count_date'] ?? now(),
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Generate a physical count worksheet listing current system quantities
     * for the requested products (or all active products/category/location).
     */
    public function generatePhysicalCountWorksheet(?array $productIds = null, ?string $category = null, ?string $location = null): array
    {
        $query = Product::active();

        if (!empty($productIds)) {
            $query->whereIn('id', $productIds);
        }

        if ($category) {
            $query->where('category', $category);
        }

        if ($location) {
            $query->where('storage_bin', $location);
        }

        $products = $query->orderBy('name')->get();

        return [
            'generated_at' => now()->toISOString(),
            'total_products' => $products->count(),
            'items' => $products->map(function (Product $product) {
                return [
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'category' => $product->category,
                    'storage_bin' => $product->storage_bin,
                    'system_quantity' => $product->quantity,
                ];
            })->values(),
        ];
    }

    /**
     * Bulk import physical count results.
     *
     * @return PhysicalCount[]
     */
    public function importPhysicalCountResults(array $results): array
    {
        return DB::transaction(function () use ($results) {
            $counts = [];

            foreach ($results as $result) {
                $counts[] = $this->recordPhysicalCount([
                    'product_id' => $result['product_id'],
                    'counted_by' => auth()->id(),
                    'counted_quantity' => $result['counted_quantity'],
                    'notes' => $result['notes'] ?? null,
                ]);
            }

            return $counts;
        });
    }

    /**
     * Approve a physical count's variance and apply the resulting stock
     * adjustment so the system quantity matches the counted quantity.
     */
    public function approveVarianceAdjustment(PhysicalCount $physicalCount): array
    {
        $product = Product::findOrFail($physicalCount->product_id);
        $adjustmentQuantity = $physicalCount->counted_quantity - $product->quantity;

        if ($adjustmentQuantity === 0) {
            return [
                'quantity' => 0,
                'type' => 'none',
                'physical_count_id' => $physicalCount->id,
            ];
        }

        $user = auth()->user();

        $this->adjustStock([
            'product_id' => $product->id,
            'adjustment_quantity' => $adjustmentQuantity,
            'reference_type' => 'physical_count',
            'reference_id' => $physicalCount->id,
            'notes' => "Variance adjustment from physical count #{$physicalCount->id}",
        ], $user);

        return [
            'quantity' => abs($adjustmentQuantity),
            'type' => $adjustmentQuantity > 0 ? 'increase' : 'decrease',
            'physical_count_id' => $physicalCount->id,
        ];
    }

    /**
     * Reserve a batch's stock against a customer order.
     */
    public function reserveBatch(Batch $batch, int $quantity, int $customerOrderId, ?string $expiresAt = null): Reservation
    {
        if ($batch->available_quantity < $quantity) {
            throw new ConflictException(
                "Insufficient available quantity in batch {$batch->batch_number}. Available: {$batch->available_quantity}, Requested: {$quantity}"
            );
        }

        return $batch->reservations()->create([
            'product_id' => $batch->product_id,
            'customer_order_id' => $customerOrderId,
            'quantity' => $quantity,
            'unit_price' => $batch->unit_cost ?? $batch->product->unit_price,
            'status' => 'allocated',
            'expires_at' => $expiresAt ? \Carbon\Carbon::parse($expiresAt) : now()->addHours(24),
            'reserved_by' => auth()->id(),
        ]);
    }

    /**
     * Release a batch reservation by ID.
     */
    public function releaseBatchReservation(int $reservationId): bool
    {
        $reservation = Reservation::find($reservationId);

        if (!$reservation) {
            throw new ResourceNotFoundException('Reservation', $reservationId);
        }

        return $reservation->cancel();
    }

    /**
     * Mark a batch as expired regardless of its expiry date.
     */
    public function markBatchExpired(Batch $batch): Batch
    {
        $batch->status = \App\Support\Enums\BatchStatus::EXPIRED;
        $batch->save();

        return $batch->refresh();
    }
}