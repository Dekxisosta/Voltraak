<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\StockTransactionType;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use App\Core\Events\InventoryEvents;
use App\Core\Exceptions\ConflictException;
use App\Core\Exceptions\ValidationException;
use Illuminate\Support\Facades\DB;

/**
 * Core inventory management service
 */
class InventoryService
{
    public function __construct(
        private ActivityLogger $activityLogger,
        private NotificationService $notificationService,
        private FEFOService $fefoService,
        private VarianceService $varianceService
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
}