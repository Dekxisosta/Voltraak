<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Support\Enums\BatchStatus;
use App\Core\Logging\ActivityLogger;
use Carbon\Carbon;

/**
 * First-Expired, First-Out (FEFO) service implementation
 * 
 * Enforces FEFO picking rules and provides batch selection logic
 * as defined in Backend/Services.md
 */
class FEFOService
{
    public function __construct(
        private ActivityLogger $activityLogger
    ) {}

    /**
     * Select batch for picking using FEFO logic
     * Returns the batch with earliest expiry date that has sufficient quantity
     */
    public function selectBatchForPick(Product $product, int $requiredQuantity): ?Batch
    {
        return $product->getBatchesFefoOrder()
            ->where('quantity', '>=', $requiredQuantity)
            ->first();
    }

    /**
     * Get pick order for all available batches of a product
     * Sorted by expiry date ascending (FEFO order)
     */
    public function getPickOrder(Product $product): array
    {
        $batches = $product->getBatchesFefoOrder();
        
        return $batches->map(function ($batch) {
            return [
                'batch_id' => $batch->id,
                'batch_number' => $batch->batch_number,
                'quantity' => $batch->quantity,
                'available_quantity' => $batch->available_quantity,
                'expiry_date' => $batch->expiry_date?->toDateString(),
                'days_to_expiry' => $batch->days_to_expiry,
                'status' => $batch->status->value,
                'status_display' => $batch->status->getDisplayName(),
                'priority' => $this->getBatchPriority($batch),
            ];
        })->toArray();
    }

    /**
     * Get batch priority for picking (1 = highest priority)
     */
    public function getBatchPriority(Batch $batch): int
    {
        if (!$batch->expiry_date) {
            return 999; // Non-expiring items have lowest priority
        }

        $daysToExpiry = $batch->days_to_expiry;
        
        return match($batch->status) {
            BatchStatus::EXPIRED => 1000, // Should not be picked
            BatchStatus::WARNING => 1, // Highest priority
            BatchStatus::SAFE => max(2, $daysToExpiry), // Priority based on days to expiry
        };
    }

    /**
     * Validate FEFO compliance for a specific batch pick
     */
    public function validateFefoCompliance(Batch $selectedBatch, int $quantity): bool
    {
        // Can't pick from expired batches
        if ($selectedBatch->status === BatchStatus::EXPIRED) {
            return false;
        }

        // Can't pick more than available
        if ($selectedBatch->available_quantity < $quantity) {
            return false;
        }

        // Check if there are earlier expiring batches with sufficient quantity
        $earlierBatch = $this->getEarlierAvailableBatch($selectedBatch->product, $selectedBatch);
        
        return $earlierBatch === null;
    }

    /**
     * Get earlier available batch that should be picked first
     */
    public function getEarlierAvailableBatch(Product $product, ?Batch $comparedToBatch = null): ?Batch
    {
        $query = $product->activeBatches()
            ->where('quantity', '>', 0)
            ->fefoOrder();

        if ($comparedToBatch) {
            if ($comparedToBatch->expiry_date) {
                $query->where('expiry_date', '<', $comparedToBatch->expiry_date);
            } else {
                // If compared batch has no expiry, check for any batch with expiry
                $query->whereNotNull('expiry_date');
            }
        }

        return $query->first();
    }

    /**
     * Get FEFO recommendations for picking
     */
    public function getFefoRecommendations(Product $product, int $requiredQuantity = null): array
    {
        $batches = $this->getPickOrder($product);
        
        $recommendations = [];
        $remainingQuantity = $requiredQuantity;
        
        foreach ($batches as $batch) {
            if ($batch['status'] === BatchStatus::EXPIRED->value) {
                continue;
            }

            $recommendation = [
                'batch_id' => $batch['batch_id'],
                'batch_number' => $batch['batch_number'],
                'recommended_quantity' => 0,
                'available_quantity' => $batch['available_quantity'],
                'expiry_date' => $batch['expiry_date'],
                'days_to_expiry' => $batch['days_to_expiry'],
                'status' => $batch['status'],
                'reason' => '',
            ];

            if ($remainingQuantity > 0) {
                $pickQuantity = min($remainingQuantity, $batch['available_quantity']);
                $recommendation['recommended_quantity'] = $pickQuantity;
                $recommendation['reason'] = 'FEFO - Pick from earliest expiring batch';
                $remainingQuantity -= $pickQuantity;
            } else {
                $recommendation['reason'] = 'Reserve for future picks';
            }

            // Add urgency flags
            if ($batch['days_to_expiry'] !== null) {
                if ($batch['days_to_expiry'] <= 0) {
                    $recommendation['urgency'] = 'expired';
                } elseif ($batch['days_to_expiry'] <= 7) {
                    $recommendation['urgency'] = 'critical';
                } elseif ($batch['days_to_expiry'] <= 30) {
                    $recommendation['urgency'] = 'high';
                } else {
                    $recommendation['urgency'] = 'normal';
                }
            } else {
                $recommendation['urgency'] = 'none';
            }

            $recommendations[] = $recommendation;
        }

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'required_quantity' => $requiredQuantity,
            'total_available' => $product->available_quantity,
            'can_fulfill' => $requiredQuantity ? $product->available_quantity >= $requiredQuantity : true,
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Calculate optimal pick allocation across multiple batches
     */
    public function calculateOptimalPickAllocation(Product $product, int $requiredQuantity): array
    {
        $batches = $product->getBatchesFefoOrder();
        $allocation = [];
        $remainingQuantity = $requiredQuantity;

        foreach ($batches as $batch) {
            if ($remainingQuantity <= 0 || $batch->status === BatchStatus::EXPIRED) {
                break;
            }

            $pickQuantity = min($remainingQuantity, $batch->available_quantity);
            
            if ($pickQuantity > 0) {
                $allocation[] = [
                    'batch_id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'quantity' => $pickQuantity,
                    'expiry_date' => $batch->expiry_date?->toDateString(),
                    'days_to_expiry' => $batch->days_to_expiry,
                ];
                
                $remainingQuantity -= $pickQuantity;
            }
        }

        return [
            'allocations' => $allocation,
            'total_allocated' => $requiredQuantity - $remainingQuantity,
            'shortage' => $remainingQuantity,
            'can_fulfill_completely' => $remainingQuantity === 0,
        ];
    }

    /**
     * Check for FEFO violations in current inventory
     */
    public function checkFefoViolations(): array
    {
        $violations = [];
        
        $products = Product::active()
            ->whereHas('batches', function ($query) {
                $query->active()->where('quantity', '>', 0);
            })
            ->with(['batches' => function ($query) {
                $query->active()->where('quantity', '>', 0)->fefoOrder();
            }])
            ->get();

        foreach ($products as $product) {
            $batches = $product->batches;
            
            for ($i = 0; $i < $batches->count() - 1; $i++) {
                $currentBatch = $batches[$i];
                $nextBatch = $batches[$i + 1];
                
                // Check if later batch has earlier expiry (violation)
                if ($currentBatch->expiry_date && $nextBatch->expiry_date) {
                    if ($currentBatch->expiry_date > $nextBatch->expiry_date) {
                        $violations[] = [
                            'product_id' => $product->id,
                            'product_sku' => $product->sku,
                            'product_name' => $product->name,
                            'violation_type' => 'batch_order',
                            'current_batch' => $currentBatch->batch_number,
                            'current_expiry' => $currentBatch->expiry_date->toDateString(),
                            'next_batch' => $nextBatch->batch_number,
                            'next_expiry' => $nextBatch->expiry_date->toDateString(),
                            'severity' => 'medium',
                        ];
                    }
                }
            }
        }

        return $violations;
    }

    /**
     * Get expiry status for batch based on days remaining
     */
    public function getExpiryStatus(Batch $batch): array
    {
        if (!$batch->expiry_date) {
            return [
                'status' => 'no_expiry',
                'days_remaining' => null,
                'color' => 'gray',
                'message' => 'No expiry date',
            ];
        }

        $daysRemaining = $batch->days_to_expiry;

        if ($daysRemaining <= 0) {
            return [
                'status' => 'expired',
                'days_remaining' => $daysRemaining,
                'color' => 'red',
                'message' => 'Expired',
            ];
        } elseif ($daysRemaining <= 7) {
            return [
                'status' => 'critical',
                'days_remaining' => $daysRemaining,
                'color' => 'red',
                'message' => "Expires in {$daysRemaining} days - URGENT",
            ];
        } elseif ($daysRemaining <= 30) {
            return [
                'status' => 'warning',
                'days_remaining' => $daysRemaining,
                'color' => 'orange',
                'message' => "Expires in {$daysRemaining} days",
            ];
        } elseif ($daysRemaining <= 60) {
            return [
                'status' => 'caution',
                'days_remaining' => $daysRemaining,
                'color' => 'yellow',
                'message' => "Expires in {$daysRemaining} days",
            ];
        } else {
            return [
                'status' => 'safe',
                'days_remaining' => $daysRemaining,
                'color' => 'green',
                'message' => "Expires in {$daysRemaining} days",
            ];
        }
    }

    /**
     * Log FEFO violation attempt
     */
    public function logFefoViolationAttempt(Batch $attemptedBatch, ?Batch $earlierBatch, int $userId): void
    {
        $this->activityLogger->logFefoViolation(
            $attemptedBatch->product->sku,
            $attemptedBatch->batch_number,
            $earlierBatch?->batch_number ?? 'Unknown',
            User::find($userId)
        );
    }

    /**
     * Get batch allocation suggestions for multiple products
     */
    public function getBulkPickSuggestions(array $requirements): array
    {
        $suggestions = [];
        
        foreach ($requirements as $requirement) {
            $product = Product::findOrFail($requirement['product_id']);
            $quantity = $requirement['quantity'];
            
            $suggestion = $this->calculateOptimalPickAllocation($product, $quantity);
            $suggestion['product_id'] = $product->id;
            $suggestion['product_sku'] = $product->sku;
            $suggestion['product_name'] = $product->name;
            
            $suggestions[] = $suggestion;
        }
        
        return $suggestions;
    }
}