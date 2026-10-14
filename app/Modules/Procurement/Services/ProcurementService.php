<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\PurchaseOrderItem;
use App\Modules\Procurement\Models\ProcurementRequest;
use App\Modules\Inventory\Models\Product;
use App\Support\Enums\PurchaseOrderStatus;
use App\Support\Enums\ProcurementRequestStatus;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProcurementService
{
    public function __construct(
        private ActivityLogger $activityLogger,
        private NotificationService $notificationService,
        private ReorderPointCalculator $reorderCalculator
    ) {}

    /*
    |--------------------------------------------------------------------------
    | Purchase Order Management
    |--------------------------------------------------------------------------
    */

    /**
     * Create a new purchase order.
     */
    public function createPurchaseOrder(array $data, array $items = []): PurchaseOrder
    {
        DB::beginTransaction();

        try {
            // Generate PO number if not provided
            if (empty($data['po_number'])) {
                $data['po_number'] = PurchaseOrder::generatePoNumber();
            }

            // Set default status
            $data['status'] = $data['status'] ?? PurchaseOrderStatus::PENDING;

            // Set order date if not provided
            $data['order_date'] = $data['order_date'] ?? now()->format('Y-m-d');

            // Set creator if not provided
            $data['created_by'] = $data['created_by'] ?? auth()->id();

            // Calculate expected delivery date
            if (empty($data['expected_delivery_date']) && isset($data['supplier_id'])) {
                $supplier = Supplier::find($data['supplier_id']);
                if ($supplier) {
                    $data['expected_delivery_date'] = $supplier->getExpectedDeliveryDate()->format('Y-m-d');
                }
            }

            $purchaseOrder = PurchaseOrder::create($data);

            // Add items if provided
            if (!empty($items)) {
                $this->addItemsToPurchaseOrder($purchaseOrder, $items);
            }

            // Log activity
            $this->activityLogger->logProcurementOperation(
                'purchase_order.created',
                $purchaseOrder->po_number,
                auth()->user(),
                $data
            );

            DB::commit();

            return $purchaseOrder->load(['supplier', 'items.product']);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Add items to a purchase order.
     */
    public function addItemsToPurchaseOrder(PurchaseOrder $purchaseOrder, array $items): Collection
    {
        $createdItems = collect();

        foreach ($items as $itemData) {
            $item = PurchaseOrderItem::create([
                'purchase_order_id' => $purchaseOrder->id,
                'product_id' => $itemData['product_id'],
                'quantity' => $itemData['quantity'],
                'unit_cost' => $itemData['unit_cost'],
                'notes' => $itemData['notes'] ?? null
            ]);

            $createdItems->push($item);
        }

        // Recalculate totals
        $purchaseOrder->calculateTotals();
        $purchaseOrder->save();

        return $createdItems;
    }

    /**
     * Approve a purchase order.
     */
    public function approvePurchaseOrder(PurchaseOrder $purchaseOrder, \App\Models\User $approver): bool
    {
        if (!$purchaseOrder->canBeApproved()) {
            throw new \InvalidArgumentException('Purchase order cannot be approved in current state');
        }

        $success = $purchaseOrder->approve($approver);

        if ($success) {
            $this->activityLogger->logProcurementOperation(
                'purchase_order.approved',
                $purchaseOrder->po_number,
                $approver,
                ['approved_by' => $approver->id]
            );

            // Send notification to the creator
            if ($purchaseOrder->created_by) {
                $this->notificationService->sendNotification(
                    'po_approval',
                    "Purchase order {$purchaseOrder->po_number} has been approved",
                    [$purchaseOrder->created_by],
                    ['purchase_order_id' => $purchaseOrder->id]
                );
            }
        }

        return $success;
    }

    /**
     * Reject a pending purchase order.
     */
    public function rejectPurchaseOrder(PurchaseOrder $purchaseOrder, \App\Models\User $reviewer, ?string $reason = null): bool
    {
        if (!$purchaseOrder->canBeRejected()) {
            throw new \InvalidArgumentException('Purchase order cannot be rejected in current state');
        }

        $success = $purchaseOrder->reject($reviewer, $reason);

        if ($success) {
            $this->activityLogger->logProcurementOperation(
                'purchase_order.rejected',
                $purchaseOrder->po_number,
                $reviewer,
                ['rejected_by' => $reviewer->id, 'reason' => $reason]
            );

            if ($purchaseOrder->created_by) {
                $this->notificationService->sendNotification(
                    'po_approval',
                    "Purchase order {$purchaseOrder->po_number} has been rejected",
                    [$purchaseOrder->created_by],
                    ['purchase_order_id' => $purchaseOrder->id]
                );
            }
        }

        return $success;
    }

    /**
     * Send purchase order to supplier.
     */
    public function sendPurchaseOrderToSupplier(PurchaseOrder $purchaseOrder): bool
    {
        if (!$purchaseOrder->canBeSent()) {
            throw new \InvalidArgumentException('Purchase order cannot be sent in current state');
        }

        $success = $purchaseOrder->sendToSupplier();

        if ($success) {
            $this->activityLogger->logProcurementOperation(
                'purchase_order.sent',
                $purchaseOrder->po_number,
                auth()->user(),
                ['supplier_id' => $purchaseOrder->supplier_id]
            );

            // Here you would integrate with email/notification system to actually send to supplier
            // For now, we just log the activity
        }

        return $success;
    }

    /**
     * Mark purchase order as delivered/received and process stock.
     * 
     * @deprecated Use PurchaseOrderService::receive() instead, which properly handles batch data and stock-in processing.
     */
    public function deliverPurchaseOrder(PurchaseOrder $purchaseOrder, ?\Carbon\Carbon $deliveredAt = null): array
    {
        throw new \BadMethodCallException('Use PurchaseOrderService::receive() to receive a PO delivery.');
    }

    /*
    |--------------------------------------------------------------------------
    | Reorder Suggestion (Procurement Request) Management
    |--------------------------------------------------------------------------
    */

    /**
     * Approve a reorder suggestion.
     */
    public function approveProcurementRequest(ProcurementRequest $request, \App\Models\User $reviewer): bool
    {
        if (!$request->canBeApproved()) {
            throw new \InvalidArgumentException('Procurement request cannot be approved in current state');
        }

        $success = $request->approve($reviewer);

        if ($success) {
            $this->activityLogger->logProcurementOperation(
                'procurement_request.approved',
                (string) $request->id,
                $reviewer,
                ['approved_by' => $reviewer->id]
            );
        }

        return $success;
    }

    /**
     * Dismiss a reorder suggestion.
     */
    public function dismissProcurementRequest(ProcurementRequest $request, \App\Models\User $reviewer, ?string $reason = null): bool
    {
        if (!$request->canBeDismissed()) {
            throw new \InvalidArgumentException('Procurement request cannot be dismissed in current state');
        }

        $success = $request->dismiss($reviewer, $reason);

        if ($success) {
            $this->activityLogger->logProcurementOperation(
                'procurement_request.dismissed',
                (string) $request->id,
                $reviewer,
                ['reason' => $reason]
            );
        }

        return $success;
    }

    /**
     * Convert an approved reorder suggestion into a purchase order.
     */
    public function convertRequestToPurchaseOrder(ProcurementRequest $request, array $additionalData = []): PurchaseOrder
    {
        if ($request->status !== ProcurementRequestStatus::APPROVED) {
            throw new \InvalidArgumentException('Only approved requests can be converted to purchase orders');
        }

        if (empty($additionalData['supplier_id'])) {
            throw new \InvalidArgumentException('A supplier must be specified to convert a reorder suggestion to a purchase order');
        }

        DB::beginTransaction();

        try {
            // Re-fetch with a row lock to prevent double-click duplicates
            $request = ProcurementRequest::lockForUpdate()->findOrFail($request->id);
            
            // Re-check status after acquiring lock
            if ($request->status !== ProcurementRequestStatus::APPROVED) {
                throw new \InvalidArgumentException('Request is no longer in approved status (possible duplicate submission).');
            }
            
            $product = $request->product;

            // Create purchase order
            $poData = array_merge([
                'supplier_id' => $additionalData['supplier_id'],
                'created_by' => $request->generated_by ?? auth()->id(),
                'status' => PurchaseOrderStatus::PENDING,
                'order_date' => now()->format('Y-m-d'),
                'notes' => "Generated from reorder suggestion #{$request->id}",
            ], $additionalData);

            $purchaseOrder = $this->createPurchaseOrder($poData, [
                [
                    'product_id' => $request->product_id,
                    'quantity' => $request->suggested_quantity,
                    'unit_cost' => $product->unit_price ?? 0,
                    'notes' => "From reorder suggestion #{$request->id}"
                ]
            ]);

            // Mark the suggestion as converted
            $request->markConverted();

            $this->activityLogger->logProcurementOperation(
                'procurement_request.converted_to_po',
                $purchaseOrder->po_number,
                auth()->user(),
                [
                    'request_id' => $request->id,
                    'purchase_order_id' => $purchaseOrder->id,
                ]
            );

            DB::commit();

            return $purchaseOrder;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Reorder Management
    |--------------------------------------------------------------------------
    */

    /**
     * Generate reorder suggestions for products below reorder level.
     */
    public function generateReorderRequests(?\App\Models\User $generator = null): Collection
    {
        $generator = $generator ?? auth()->user();

        $requests = ProcurementRequest::generateForLowStockProducts($generator);

        if ($requests->isNotEmpty()) {
            $this->activityLogger->logProcurementOperation(
                'reorder.auto_generated',
                (string) $requests->count(),
                $generator,
                [
                    'requests_count' => $requests->count(),
                    'products' => $requests->pluck('product.name')->toArray()
                ]
            );

            // Notify managers about auto-generated requests
            $this->notificationService->sendBulkNotification(
                'system_alert',
                "{$requests->count()} automatic reorder suggestions have been generated",
                ['manager'],
                ['request_ids' => $requests->pluck('id')->toArray()]
            );
        }

        return $requests;
    }

    /**
     * Calculate optimal reorder points for products.
     */
    public function calculateReorderPoints(?Collection $products = null): array
    {
        $products = $products ?? Product::active()->get();
        $results = [];

        foreach ($products as $product) {
            $currentReorderLevel = $product->reorder_level;
            $calculatedReorderPoint = $this->reorderCalculator->calculateReorderPoint($product);

            $results[] = [
                'product' => $product,
                'current_reorder_level' => $currentReorderLevel,
                'calculated_reorder_point' => $calculatedReorderPoint,
                'recommendation' => $this->getReorderPointRecommendation($currentReorderLevel, $calculatedReorderPoint),
                'variance' => $calculatedReorderPoint - $currentReorderLevel,
                'variance_percentage' => $currentReorderLevel > 0 ?
                    (($calculatedReorderPoint - $currentReorderLevel) / $currentReorderLevel) * 100 : 0
            ];
        }

        return $results;
    }

    /**
     * Update reorder points for products based on calculations.
     */
    public function updateReorderPointsForProducts(?Collection $products = null): array
    {
        $results = $this->calculateReorderPoints($products);
        
        $updated = 0;
        $skipped = 0;
        
        foreach ($results as $result) {
            $product = $result['product'];
            $newReorderPoint = $result['calculated_reorder_point'];
            
            if ($product->reorder_level !== $newReorderPoint) {
                $product->reorder_level = $newReorderPoint;
                
                // Update analytics columns if they exist
                try {
                    $demandAnalysis = $this->reorderCalculator->analyzeDemand($product);
                    $leadTimeAnalysis = $this->reorderCalculator->analyzeLeadTime($product);
                    
                    if ($product->getConnection()->getSchemaBuilder()->hasColumn('products', 'avg_daily_usage')) {
                        $product->avg_daily_usage = $demandAnalysis['average_daily_demand'];
                    }
                    
                    if ($product->getConnection()->getSchemaBuilder()->hasColumn('products', 'lead_time_days')) {
                        $product->lead_time_days = $leadTimeAnalysis['average_lead_time'];
                    }
                    
                } catch (\Exception $e) {
                    // Continue without analytics if calculation fails
                }
                
                $product->save();
                $updated++;
            } else {
                $skipped++;
            }
        }
        
        return [
            'analyzed_products' => count($results),
            'updated_products' => $updated,
            'skipped_products' => $skipped,
            'results' => $results
        ];
    }

    /**
     * Get reorder point recommendation.
     */
    private function getReorderPointRecommendation(int $current, int $calculated): string
    {
        $variance = abs($calculated - $current);
        $percentageChange = $current > 0 ? ($variance / $current) * 100 : 0;

        if ($percentageChange <= 10) {
            return 'maintain'; // Within 10% - maintain current
        } elseif ($calculated > $current) {
            return $percentageChange > 25 ? 'increase_significant' : 'increase_moderate';
        } else {
            return $percentageChange > 25 ? 'decrease_significant' : 'decrease_moderate';
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Supplier Management
    |--------------------------------------------------------------------------
    */

    /**
     * Evaluate supplier performance.
     */
    public function evaluateSupplierPerformance(Supplier $supplier): array
    {
        $metrics = $supplier->getReliabilityMetrics();

        // Calculate performance score (0-100)
        $completionScore = $metrics['completion_rate'];
        $deliveryScore = $metrics['on_time_delivery_rate'];
        $consistencyScore = $this->calculateConsistencyScore($supplier);

        $overallScore = ($completionScore * 0.4) + ($deliveryScore * 0.4) + ($consistencyScore * 0.2);

        // Determine performance grade
        $grade = match(true) {
            $overallScore >= 90 => 'A',
            $overallScore >= 80 => 'B',
            $overallScore >= 70 => 'C',
            $overallScore >= 60 => 'D',
            default => 'F'
        };

        return [
            'metrics' => $metrics,
            'scores' => [
                'completion' => $completionScore,
                'delivery' => $deliveryScore,
                'consistency' => $consistencyScore,
                'overall' => $overallScore
            ],
            'grade' => $grade,
            'is_preferred' => $supplier->isPreferred(),
            'recommendations' => $this->getSupplierRecommendations($supplier, $overallScore)
        ];
    }

    /**
     * Calculate supplier consistency score.
     */
    private function calculateConsistencyScore(Supplier $supplier): float
    {
        // This would analyze variance in delivery times, order processing, etc.
        // For now, return a placeholder based on lead time reliability
        $recentOrders = $supplier->purchaseOrders()
            ->whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
            ->where('created_at', '>=', now()->subMonths(6))
            ->get();

        if ($recentOrders->isEmpty()) {
            return 75; // Default score for new suppliers
        }

        // Calculate variance in delivery performance
        $deliveryVariances = $recentOrders->map(function ($order) {
            return abs($order->delivery_variance_days ?? 0);
        });

        $averageVariance = $deliveryVariances->avg();

        // Lower variance = higher consistency score
        return max(0, 100 - ($averageVariance * 10));
    }

    /**
     * Get supplier recommendations.
     */
    private function getSupplierRecommendations(Supplier $supplier, float $score): array
    {
        $recommendations = [];

        if ($score < 60) {
            $recommendations[] = 'Consider finding alternative suppliers';
            $recommendations[] = 'Review contract terms and performance expectations';
        } elseif ($score < 80) {
            $recommendations[] = 'Monitor delivery performance closely';
            $recommendations[] = 'Consider supplier development programs';
        } else {
            $recommendations[] = 'Maintain current relationship';
            if ($score >= 90) {
                $recommendations[] = 'Consider for preferred supplier status';
                $recommendations[] = 'Explore opportunities for strategic partnership';
            }
        }

        return $recommendations;
    }

    /*
    |--------------------------------------------------------------------------
    | Analytics & Reporting
    |--------------------------------------------------------------------------
    */

    /**
     * Get procurement dashboard data.
     */
    public function getDashboardData(): array
    {
        $today = now();
        $thisMonth = $today->copy()->startOfMonth();
        $lastMonth = $today->copy()->subMonth()->startOfMonth();

        return [
            'pending_requests' => ProcurementRequest::pending()->count(),
            'urgent_requests' => ProcurementRequest::pending()->urgent()->count(),
            'overdue_orders' => PurchaseOrder::overdue()->count(),
            'monthly_spend' => [
                'current' => PurchaseOrder::getTotalValueForPeriod($thisMonth, $today),
                'previous' => PurchaseOrder::getTotalValueForPeriod($lastMonth, $thisMonth->copy()->subDay())
            ],
            'top_suppliers' => $this->getTopSuppliersByValue(5),
            'reorder_alerts' => Product::lowStock()->count(),
            'recent_activities' => $this->getRecentProcurementActivities(10)
        ];
    }

    /**
     * Get top suppliers by order value.
     */
    private function getTopSuppliersByValue(int $limit = 5): Collection
    {
        return Supplier::withSum(['purchaseOrders as total_orders_value' => function($query) {
                $query->whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
                      ->where('created_at', '>=', now()->subMonths(12));
            }], 'total_amount')
            ->orderBy('total_orders_value', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent procurement activities.
     */
    private function getRecentProcurementActivities(int $limit = 10): Collection
    {
        // This would fetch from activity log
        // For now, return a placeholder
        return collect();
    }
}
