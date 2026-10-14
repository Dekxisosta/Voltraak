<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\DamageReport;
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
     * The single writer for stock quantities.
     *
     * Every change to products.quantity or batches.quantity goes through here
     * (receive, issue, adjust, write-off, reversal), so the batch, the product
     * and the ledger row are always updated together, in one database
     * transaction, under row locks taken in a fixed order (product, then
     * batch) so concurrent callers queue instead of overwriting each other.
     *
     * Direction: $delta is signed (+ adds stock, - removes it). It must agree
     * with $type: IN/RETURN need a positive delta, OUT a negative one,
     * ADJUSTMENT either. The ledger stores a positive magnitude for IN, OUT
     * and RETURN and the signed delta for ADJUSTMENT. TRANSFER moves nothing
     * and is rejected.
     *
     * Quantities are never silently clamped: a change that would take the
     * product or the batch below zero throws ConflictException.
     *
     * @param array{unit_cost?: mixed, reference_number?: ?string, reason?: ?string, reference_type?: ?string, reference_id?: ?int, notes?: ?string, reverses_transaction_id?: ?int} $meta
     * @param bool $touchReceivedQuantity Also move batches.received_quantity
     *        (true for receipts and for reversing a receipt).
     */
    public function applyStockChange(
        int $productId,
        ?int $batchId,
        int $delta,
        StockTransactionType $type,
        User $user,
        array $meta = [],
        bool $touchReceivedQuantity = false
    ): StockTransaction {
        if ($delta === 0) {
            throw new \InvalidArgumentException('A stock change must be non-zero.');
        }

        $directionOk = match ($type) {
            StockTransactionType::IN, StockTransactionType::RETURN => $delta > 0,
            StockTransactionType::OUT => $delta < 0,
            StockTransactionType::ADJUSTMENT => true,
            StockTransactionType::TRANSFER => throw new \InvalidArgumentException(
                'Transfers do not change quantity and cannot go through applyStockChange().'
            ),
        };

        if (!$directionOk) {
            throw new \InvalidArgumentException(
                "A {$type->value} transaction cannot have a stock change of {$delta}."
            );
        }

        return DB::transaction(function () use ($productId, $batchId, $delta, $type, $user, $meta, $touchReceivedQuantity) {
            $product = Product::whereKey($productId)->lockForUpdate()->firstOrFail();

            $batch = null;
            if ($batchId !== null) {
                $batch = Batch::whereKey($batchId)->lockForUpdate()->firstOrFail();

                if ((int) $batch->product_id !== (int) $product->id) {
                    throw new ConflictException('Batch does not belong to the specified product');
                }
            }

            $quantityBefore = (int) $product->quantity;
            $quantityAfter = $quantityBefore + $delta;

            if ($quantityAfter < 0) {
                throw ConflictException::insufficientInventory($quantityBefore, abs($delta), $product->sku);
            }

            if ($batch) {
                $batchAfter = (int) $batch->quantity + $delta;

                if ($batchAfter < 0) {
                    throw ConflictException::insufficientInventory(
                        (int) $batch->quantity,
                        abs($delta),
                        "{$product->sku} / batch {$batch->batch_number}"
                    );
                }

                $batch->quantity = $batchAfter;

                if ($touchReceivedQuantity) {
                    $batch->received_quantity = max(0, (int) $batch->received_quantity + $delta);
                }

                $batch->save();
            }

            $product->quantity = $quantityAfter;
            $product->save();

            // Cost matters for anything that removes stock or corrects it
            // (write-offs, shrinkage). Receipts only carry a cost if given.
            $unitCost = $meta['unit_cost'] ?? (
                in_array($type, [StockTransactionType::OUT, StockTransactionType::ADJUSTMENT], true)
                    ? ($batch?->unit_cost ?? $product->unit_price)
                    : null
            );

            return StockTransaction::create([
                'product_id' => $product->id,
                'batch_id' => $batch?->id,
                'user_id' => $user->id,
                'type' => $type,
                'quantity' => $type->isSigned() ? $delta : abs($delta),
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'unit_cost' => $unitCost,
                'reference_number' => $meta['reference_number'] ?? null,
                'reason' => $meta['reason'] ?? null,
                'reference_type' => $meta['reference_type'] ?? null,
                'reference_id' => $meta['reference_id'] ?? null,
                'reverses_transaction_id' => $meta['reverses_transaction_id'] ?? null,
                'notes' => $meta['notes'] ?? null,
            ]);
        });
    }

    /**
     * Receive stock into inventory
     */
    public function receiveStock(array $data, User $user): StockTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);

            // Find or create the batch (at zero); the quantity itself is
            // added by applyStockChange so batch and product stay in step.
            // An explicit existing batch (batch_id) is honoured too; before,
            // only batch_data was looked at, so stock received "into" an
            // existing batch never reached that batch.
            $batch = isset($data['batch_data'])
                ? $this->findOrCreateBatch($product, $data['batch_data'])
                : (!empty($data['batch_id']) ? Batch::findOrFail((int) $data['batch_id']) : null);

            $transaction = $this->applyStockChange(
                $product->id,
                $batch?->id,
                (int) $data['quantity'],
                StockTransactionType::IN,
                $user,
                [
                    'unit_cost' => $data['unit_cost'] ?? null,
                    'reference_number' => $data['reference_number'] ?? null,
                    'reason' => $data['reason'] ?? null,
                    'reference_type' => $data['reference_type'] ?? null,
                    'reference_id' => $data['reference_id'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ],
                true
            );

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_received',
                $product->sku,
                $data['quantity'],
                $user,
                ['batch_id' => $batch?->id, 'transaction_id' => $transaction->id]
            );

            // Fire event
            // TODO: Implement StockReceived event
            // event(new InventoryEvents\StockReceived(
            //     $product->id,
            //     $data['quantity'],
            //     $batch?->id,
            //     $user->id
            // ));

            return $transaction;
        });
    }

    /**
     * Issue stock from inventory with FEFO enforcement
     */
    public function issueStock(array $data, User $user, ?int $excludeOrderId = null): StockTransaction
    {
        return DB::transaction(function () use ($data, $user, $excludeOrderId) {
            // Lock the product before checking availability so the checks
            // below run against numbers no other writer can change.
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();

            // Check sufficient quantity
            $availableQuantity = $excludeOrderId 
                ? $product->availableForOrder($excludeOrderId)
                : $product->available_quantity;
            
            if ($availableQuantity < $data['quantity']) {
                throw ConflictException::insufficientInventory(
                    $availableQuantity,
                    $data['quantity'],
                    $product->sku
                );
            }

            // Get batch using FEFO if not specified
            $batch = null;
            if (isset($data['batch_id'])) {
                $batch = Batch::findOrFail($data['batch_id']);

                // Validate FEFO compliance
                if (!$this->fefoService->validateFefoCompliance($batch, $data['quantity'], $excludeOrderId)) {
                    $earlierBatch = $this->fefoService->getEarlierAvailableBatch($product);
                    throw ConflictException::fefoViolation($batch->id, $earlierBatch?->id);
                }
            } else {
                $batch = $this->fefoService->selectBatchForPick($product, $data['quantity']);

                if (!$batch) {
                    throw ConflictException::insufficientInventory(0, $data['quantity'], $product->sku);
                }
            }

            // Batch, product and ledger row are updated together.
            $transaction = $this->applyStockChange(
                $product->id,
                $batch->id,
                -(int) $data['quantity'],
                StockTransactionType::OUT,
                $user,
                [
                    'unit_cost' => $batch->unit_cost ?? $product->unit_price,
                    'reference_number' => $data['reference_number'] ?? null,
                    'reason' => $data['reason'] ?? null,
                    'reference_type' => $data['reference_type'] ?? null,
                    'reference_id' => $data['reference_id'] ?? null,
                    'notes' => $data['notes'] ?? null,
                ]
            );

            $product->refresh();

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
     * Adjust stock quantity.
     *
     * `adjustment_quantity` is signed: positive adds stock, negative removes
     * it. The ledger row keeps that sign. Pass `batch_id` to move the batch
     * as well; without it only the product total changes.
     */
    public function adjustStock(array $data, User $user): StockTransaction
    {
        $adjustmentQuantity = (int) $data['adjustment_quantity'];

        return DB::transaction(function () use ($data, $user, $adjustmentQuantity) {
            $product = Product::findOrFail($data['product_id']);

            $transaction = $this->applyStockChange(
                $product->id,
                !empty($data['batch_id']) ? (int) $data['batch_id'] : null,
                $adjustmentQuantity,
                StockTransactionType::ADJUSTMENT,
                $user,
                [
                    'reference_number' => $data['reference_number'] ?? null,
                    'reference_type' => $data['reference_type'] ?? 'manual_adjustment',
                    'reference_id' => $data['reference_id'] ?? null,
                    'notes' => $data['notes'] ?? 'Manual stock adjustment',
                ]
            );

            // Log activity
            $this->activityLogger->logInventoryOperation(
                'stock_adjusted',
                $product->sku,
                abs($adjustmentQuantity),
                $user,
                [
                    'adjustment_type' => $adjustmentQuantity > 0 ? 'increase' : 'decrease',
                    'quantity_before' => $transaction->quantity_before,
                    'quantity_after' => $transaction->quantity_after,
                    'batch_id' => $transaction->batch_id,
                    'transaction_id' => $transaction->id
                ]
            );

            return $transaction;
        });
    }

    /**
     * Find the batch for a receipt, or create it empty.
     *
     * Never touches quantity: the receipt quantity is added afterwards by
     * applyStockChange().
     */
    public function findOrCreateBatch(Product $product, array $batchData): Batch
    {
        return Batch::firstOrCreate(
            [
                'product_id' => $product->id,
                'batch_number' => $batchData['batch_number'] ?? $this->generateBatchNumber($product),
            ],
            [
                'quantity' => 0,
                'received_quantity' => 0,
                'manufacture_date' => $batchData['manufacture_date'] ?? null,
                'expiry_date' => $batchData['expiry_date'] ?? null,
                'unit_cost' => $batchData['unit_cost'] ?? null,
                'supplier_batch_number' => $batchData['supplier_batch_number'] ?? null,
                'notes' => $batchData['notes'] ?? null,
            ]
        );
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
            'net_movement' => $transactions->sum('impact'),
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
     * Process expired batches: every batch past its expiry date has its
     * remaining quantity written off (see markBatchExpired).
     *
     * @param User|null $user Who the write-offs are recorded against. Needed
     *        when there is no logged-in user, e.g. from a scheduled job.
     */
    public function processExpiredBatches(?User $user = null): array
    {
        $user ??= auth()->user();

        if (!$user) {
            throw new \InvalidArgumentException('A user is required to write off expired batches.');
        }

        $expiredBatches = Batch::where('expiry_date', '<', now())
            ->where('status', '!=', \App\Support\Enums\BatchStatus::EXPIRED->value)
            ->get();

        $processed = [];

        foreach ($expiredBatches as $batch) {
            $writtenOff = (int) $batch->quantity;

            $processed[] = $this->markBatchExpired($batch, $user);

            // Fire expiry event
            event(new InventoryEvents\BatchExpired(
                $batch->id,
                $batch->product_id,
                $writtenOff
            ));
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
                    'reason' => $data['reason'] ?? null,
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
                'reason' => $data['reason'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'notes' => $data['notes'] ?? null,
            ], $user);
        }

        return $transactions;
    }

    /**
     * Reverse a previous stock transaction by creating the inverse movement.
     *
     * The reversal is a signed ADJUSTMENT linked to the original through
     * `reverses_transaction_id` (unique, so a transaction can be reversed
     * once even under concurrent requests). If the original came from an
     * approved physical count or damage report, that document is reopened.
     *
     * @throws ConflictException when the transaction is a transfer, is itself
     *         a reversal, was already reversed, or the stock is no longer
     *         there to take back.
     */
    public function reverseTransaction(StockTransaction $transaction, ?User $user = null): StockTransaction
    {
        $user ??= auth()->user();

        if (!$user) {
            throw new \InvalidArgumentException('A user is required to reverse a transaction.');
        }

        return DB::transaction(function () use ($transaction, $user) {
            // Serialise concurrent reversals of the same row.
            $original = StockTransaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();

            if ($original->type === StockTransactionType::TRANSFER) {
                throw new ConflictException('Transfers do not change quantity and cannot be reversed.');
            }

            if ($original->reverses_transaction_id !== null) {
                throw new ConflictException('A reversal cannot itself be reversed. Record a new adjustment instead.');
            }

            if (StockTransaction::where('reverses_transaction_id', $original->id)->exists()) {
                throw new ConflictException("Transaction #{$original->id} has already been reversed.");
            }

            $reversal = $this->applyStockChange(
                (int) $original->product_id,
                $original->batch_id !== null ? (int) $original->batch_id : null,
                -$original->impact,
                StockTransactionType::ADJUSTMENT,
                $user,
                [
                    'unit_cost' => $original->unit_cost,
                    'reference_type' => 'transaction_reversal',
                    'reference_id' => $original->id,
                    'reverses_transaction_id' => $original->id,
                    'notes' => "Reversal of transaction #{$original->id}",
                ],
                $original->type === StockTransactionType::IN
            );

            $this->reopenSourceDocument($original);

            return $reversal;
        });
    }

    /**
     * Undo the approval that produced a transaction, so the physical count or
     * damage report can be reviewed again instead of staying "approved" with
     * no stock effect behind it.
     */
    private function reopenSourceDocument(StockTransaction $original): void
    {
        if (!$original->reference_id) {
            return;
        }

        switch ($original->reference_type) {
            case 'physical_count':
                $count = PhysicalCount::whereKey($original->reference_id)->lockForUpdate()->first();

                if ($count && (int) $count->adjustment_transaction_id === (int) $original->id) {
                    $count->update([
                        'variance_approved' => false,
                        'approved_by' => null,
                        'approved_at' => null,
                        'adjustment_transaction_id' => null,
                        'approval_notes' => null,
                    ]);
                }
                break;

            case 'damage_report':
                $report = DamageReport::whereKey($original->reference_id)->lockForUpdate()->first();

                if ($report && in_array($report->status, ['approved', 'written_off'], true)) {
                    $report->update(['status' => 'investigated']);
                }
                break;
        }
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
     * 
     * This is idempotent - calling it multiple times on the same count
     * will not create duplicate adjustments.
     */
    public function approveVarianceAdjustment(PhysicalCount $physicalCount): array
    {
        // Idempotency check: if already approved, return existing transaction
        if ($physicalCount->isApproved()) {
            return [
                'quantity' => abs($physicalCount->variance),
                'type' => $physicalCount->variance > 0 ? 'increase' : ($physicalCount->variance < 0 ? 'decrease' : 'none'),
                'physical_count_id' => $physicalCount->id,
                'already_approved' => true,
                'approved_at' => $physicalCount->approved_at,
                'approved_by' => $physicalCount->approved_by,
                'transaction_id' => $physicalCount->adjustment_transaction_id,
            ];
        }

        if ($physicalCount->isRejected()) {
            throw new ConflictException('This variance adjustment was rejected and can no longer be approved. Record a new count instead.');
        }

        // Check if variance can be approved
        if (!$physicalCount->canApproveVariance()) {
            throw new \InvalidArgumentException(
                $physicalCount->variance === 0 
                    ? 'Cannot approve variance: count matches system quantity exactly'
                    : 'Variance has already been approved'
            );
        }

        return DB::transaction(function () use ($physicalCount) {
            // Re-read under lock: two managers approving the same count must
            // not both apply it.
            $count = PhysicalCount::whereKey($physicalCount->id)->lockForUpdate()->firstOrFail();

            if ($count->isApproved()) {
                return [
                    'quantity' => abs($count->variance),
                    'type' => $count->variance > 0 ? 'increase' : ($count->variance < 0 ? 'decrease' : 'none'),
                    'physical_count_id' => $count->id,
                    'already_approved' => true,
                    'approved_at' => $count->approved_at,
                    'approved_by' => $count->approved_by,
                    'transaction_id' => $count->adjustment_transaction_id,
                ];
            }

            if ($count->isRejected()) {
                throw new ConflictException('This variance adjustment was rejected and can no longer be approved. Record a new count instead.');
            }

            $product = Product::whereKey($count->product_id)->lockForUpdate()->firstOrFail();

            // The variance was measured against the system quantity at count
            // time. If stock has moved since, applying "current + variance"
            // would corrupt the quantity, so refuse and ask for a recount.
            if ((int) $product->quantity !== (int) $count->system_quantity) {
                throw new ConflictException(
                    "System quantity changed since the count was taken (counted against {$count->system_quantity}, "
                    . "now {$product->quantity}). Record a new count before approving."
                );
            }

            // Land exactly on the counted quantity.
            $adjustmentQuantity = (int) $count->counted_quantity - (int) $product->quantity;

            if ($adjustmentQuantity === 0) {
                // Mark as approved even though no adjustment needed
                $count->update([
                    'variance_approved' => true,
                    'approved_by' => auth()->id(),
                    'approved_at' => now(),
                    'approval_notes' => 'No adjustment needed - count matches system quantity',
                ]);

                return [
                    'quantity' => 0,
                    'type' => 'none',
                    'physical_count_id' => $count->id,
                    'already_approved' => false,
                ];
            }

            $user = auth()->user();

            // Apply the stock adjustment
            $transaction = $this->adjustStock([
                'product_id' => $product->id,
                'adjustment_quantity' => $adjustmentQuantity,
                'reference_type' => 'physical_count',
                'reference_id' => $count->id,
                'reference_number' => $count->count_reference,
                'notes' => "Variance adjustment from physical count #{$count->id} - " .
                          ($adjustmentQuantity > 0 ? 'Overage' : 'Shrinkage') .
                          " of " . abs($adjustmentQuantity) . " units",
            ], $user);

            // Mark the physical count as approved with transaction reference
            $count->update([
                'variance_approved' => true,
                'approved_by' => $user->id,
                'approved_at' => now(),
                'adjustment_transaction_id' => $transaction->id,
                'approval_notes' => "Approved by {$user->name}",
            ]);

            return [
                'quantity' => abs($adjustmentQuantity),
                'type' => $adjustmentQuantity > 0 ? 'increase' : 'decrease',
                'physical_count_id' => $count->id,
                'transaction_id' => $transaction->id,
                'already_approved' => false,
            ];
        });
    }

    /**
     * Reject a physical count's variance adjustment.
     *
     * Stock is left untouched; the count is flagged as rejected so it drops
     * out of the manager's pending queue and cannot be approved later.
     * Idempotent for an already-rejected count.
     */
    public function rejectVarianceAdjustment(PhysicalCount $physicalCount, ?string $reason = null): array
    {
        return DB::transaction(function () use ($physicalCount, $reason) {
            $count = PhysicalCount::whereKey($physicalCount->id)->lockForUpdate()->firstOrFail();

            if ($count->isRejected()) {
                return [
                    'physical_count_id' => $count->id,
                    'already_rejected' => true,
                    'rejected_at' => $count->rejected_at,
                    'rejected_by' => $count->rejected_by,
                ];
            }

            if ($count->isApproved()) {
                throw new ConflictException('This variance adjustment has already been approved and cannot be rejected.');
            }

            if ($count->variance === 0) {
                throw new \InvalidArgumentException('Cannot reject variance: count matches system quantity exactly');
            }

            $user = auth()->user();

            $count->update([
                'rejected_by' => $user?->id,
                'rejected_at' => now(),
                'rejection_notes' => $reason !== null && trim($reason) !== '' ? trim($reason) : 'Rejected by manager',
            ]);

            return [
                'physical_count_id' => $count->id,
                'already_rejected' => false,
                'rejected_at' => $count->rejected_at,
                'rejected_by' => $count->rejected_by,
            ];
        });
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
     * Mark a batch as expired regardless of its expiry date, and write off
     * whatever is still in it.
     *
     * The remaining quantity leaves the batch and the product through
     * applyStockChange() as a signed ADJUSTMENT (reference_type
     * 'batch_expiry'), so expiry shows up in the ledger and in shrinkage. Any
     * reservation allocated against the batch is re-allocated or released.
     */
    public function markBatchExpired(Batch $batch, ?User $user = null): Batch
    {
        $user ??= auth()->user();

        if (!$user) {
            throw new \InvalidArgumentException('A user is required to write off an expired batch.');
        }

        return DB::transaction(function () use ($batch, $user) {
            // Same lock order as applyStockChange(): product, then batch.
            Product::whereKey($batch->product_id)->lockForUpdate()->firstOrFail();
            $locked = Batch::whereKey($batch->id)->lockForUpdate()->firstOrFail();

            $remaining = (int) $locked->quantity;

            if ($remaining > 0) {
                $this->applyStockChange(
                    (int) $locked->product_id,
                    (int) $locked->id,
                    -$remaining,
                    StockTransactionType::ADJUSTMENT,
                    $user,
                    [
                        'reference_type' => 'batch_expiry',
                        'reference_id' => $locked->id,
                        'notes' => "Expired batch {$locked->batch_number} written off ({$remaining} units)",
                    ]
                );

                $locked->refresh();
            }

            $locked->status = \App\Support\Enums\BatchStatus::EXPIRED;
            $locked->save();

            $this->reconcileReservationsForBatch($locked);

            return $locked->refresh();
        });
    }

    /**
     * Make sure no allocated reservation promises stock a batch no longer
     * has. Call it after anything that removes stock from a batch (damage
     * write-off, expiry).
     *
     * Reservations are taken back newest first until what is left fits in the
     * batch (an expired batch holds nothing). Each one is moved to the
     * earliest-expiring other usable batch that can cover it; if none can, it
     * goes back to `confirmed` with no batch, so it shows up for
     * re-allocation, and managers are notified.
     *
     * @return array{reallocated: int[], unallocated: int[]} reservation ids
     */
    public function reconcileReservationsForBatch(Batch $batch): array
    {
        return DB::transaction(function () use ($batch) {
            $result = ['reallocated' => [], 'unallocated' => []];

            $batch = Batch::whereKey($batch->id)->lockForUpdate()->firstOrFail();
            $capacity = $batch->status === \App\Support\Enums\BatchStatus::EXPIRED
                ? 0
                : (int) $batch->quantity;

            $allocated = Reservation::where('batch_id', $batch->id)
                ->where('status', 'allocated')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();

            $committed = (int) $allocated->sum('quantity');

            foreach ($allocated as $reservation) {
                if ($committed <= $capacity) {
                    break;
                }

                $committed -= $reservation->quantity;

                $alternative = Batch::where('product_id', $batch->product_id)
                    ->where('id', '!=', $batch->id)
                    ->usable()
                    ->fefoOrder()
                    ->lockForUpdate()
                    ->get()
                    ->first(fn (Batch $candidate) => $candidate->available_quantity >= $reservation->quantity);

                if ($alternative) {
                    $reservation->update(['batch_id' => $alternative->id]);
                    $result['reallocated'][] = $reservation->id;
                } else {
                    $reservation->update([
                        'batch_id' => null,
                        'status' => 'confirmed',
                        'notes' => trim(($reservation->notes ? $reservation->notes . "\n" : '')
                            . "Batch {$batch->batch_number} stock written off; needs re-allocation."),
                    ]);
                    $result['unallocated'][] = $reservation->id;
                }
            }

            if ($result['unallocated']) {
                $this->notificationService->sendBulkNotification(
                    'reservation_unallocated',
                    'Reservations lost their batch after a write-off and need re-allocation ('
                        . count($result['unallocated']) . ')',
                    ['manager'],
                    ['batch_id' => $batch->id, 'reservation_ids' => $result['unallocated']]
                );
            }

            return $result;
        });
    }
}