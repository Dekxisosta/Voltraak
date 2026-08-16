<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\PurchaseOrderItem;
use App\Modules\Procurement\Models\ProcurementRequest;
use App\Modules\Inventory\Models\Product;
use App\Support\Enums\PurchaseOrderStatus;
use App\Support\Enums\OrderStatus;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use Illuminate\Support\Collection;

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
        \DB::beginTransaction();
        
        try {
            // Generate PO number if not provided
            if (empty($data['po_number'])) {
                $data['po_number'] = PurchaseOrder::generatePoNumber();
            }
            
            // Set default status
            $data['status'] = $data['status'] ?? PurchaseOrderStatus::PENDING;
            
            // Set order date if not provided
            $data['order_date'] = $data['order_date'] ?? now()->format('Y-m-d');
            
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
            $this->activityLogger->log(
                'purchase_order.created',
                $purchaseOrder,
                $data,
                auth()->user()
            );
            
            \DB::commit();
            
            return $purchaseOrder->load(['supplier', 'items.product']);
            
        } catch (\Exception $e) {
            \DB::rollBack();
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
        
        // Validate supplier minimum order value
        if (!$purchaseOrder->meetsSupplierMinimum()) {
            throw new \InvalidArgumentException(
                "Order value (₱{$purchaseOrder->total_amount}) does not meet supplier minimum (₱{$purchaseOrder->supplier->minimum_order_value})"
            );
        }
        
        $success = $purchaseOrder->approve();
        
        if ($success) {
            $this->activityLogger->log(
                'purchase_order.approved',
                $purchaseOrder,
                ['approved_by' => $approver->id],
                $approver
            );
            
            // Send notification to relevant users
            $this->notificationService->sendNotification([
                'type' => 'purchase_order_approved',
                'message' => "Purchase order {$purchaseOrder->po_number} has been approved",
                'data' => ['purchase_order_id' => $purchaseOrder->id],
                'user_ids' => [$purchaseOrder->user_id]
            ]);
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
            $this->activityLogger->log(
                'purchase_order.sent',
                $purchaseOrder,
                ['supplier_id' => $purchaseOrder->supplier_id],
                auth()->user()
            );
            
            // Here you would integrate with email/notification system to actually send to supplier
            // For now, we just log the activity
        }
        
        return $success;
    }

    /**
     * Mark purchase order as delivered and process stock.
     */
    public function deliverPurchaseOrder(PurchaseOrder $purchaseOrder, \Carbon\Carbon $deliveredAt = null): array
    {
        if (!$purchaseOrder->canBeDelivered()) {
            throw new \InvalidArgumentException('Purchase order cannot be marked as delivered in current state');
        }
        
        \DB::beginTransaction();
        
        try {
            $deliveredAt = $deliveredAt ?? now();
            
            // Mark PO as delivered
            $purchaseOrder->markAsDelivered($deliveredAt);
            
            // Process stock for each item
            $stockTransactions = [];
            
            foreach ($purchaseOrder->items as $item) {
                // Here we would call the InventoryService to add stock
                // For now, we simulate this
                $stockTransactions[] = [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_cost' => $item->unit_cost,
                    'reference_type' => 'purchase_order',
                    'reference_id' => $purchaseOrder->id
                ];
            }
            
            $this->activityLogger->log(
                'purchase_order.delivered',
                $purchaseOrder,
                [
                    'delivered_at' => $deliveredAt,
                    'items_count' => $purchaseOrder->items->count(),
                    'total_quantity' => $purchaseOrder->total_quantity
                ],
                auth()->user()
            );
            
            \DB::commit();
            
            return [
                'purchase_order' => $purchaseOrder,
                'stock_transactions' => $stockTransactions
            ];
            
        } catch (\Exception $e) {
            \DB::rollBack();
            throw $e;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Procurement Request Management
    |--------------------------------------------------------------------------
    */

    /**
     * Create a procurement request.
     */
    public function createProcurementRequest(array $data): ProcurementRequest
    {
        // Validate product exists and is active
        $product = Product::find($data['product_id']);
        if (!$product || !$product->is_active) {
            throw new \InvalidArgumentException('Invalid or inactive product');
        }
        
        // Set default estimated cost from product if not provided
        if (empty($data['estimated_cost'])) {
            $data['estimated_cost'] = $product->unit_cost ?? 0;
        }
        
        // Set default status
        $data['status'] = $data['status'] ?? OrderStatus::PENDING;
        
        // Set requesting user
        $data['user_id'] = $data['user_id'] ?? auth()->id();
        
        $request = ProcurementRequest::create($data);
        
        $this->activityLogger->log(
            'procurement_request.created',
            $request->product,
            $data,
            auth()->user()
        );
        
        // Send notification for urgent requests
        if ($request->urgency_level >= 4) {
            $this->notificationService->sendNotification([
                'type' => 'urgent_procurement_request',
                'message' => "Urgent procurement request for {$product->name} requires approval",
                'data' => ['request_id' => $request->id],
                'roles' => ['manager'] // Notify managers
            ]);
        }
        
        return $request->load(['product', 'supplier', 'user']);
    }

    /**
     * Process procurement request approval.
     */
    public function approveProcurementRequest(ProcurementRequest $request, \App\Models\User $approver): bool
    {
        if (!$request->canBeApproved()) {
            throw new \InvalidArgumentException('Procurement request cannot be approved in current state');
        }
        
        $success = $request->approve($approver);
        
        if ($success) {
            $this->activityLogger->log(
                'procurement_request.approved',
                $request->product,
                ['approved_by' => $approver->id],
                $approver
            );
        }
        
        return $success;
    }

    /**
     * Convert approved procurement request to purchase order.
     */
    public function convertRequestToPurchaseOrder(ProcurementRequest $request, array $additionalData = []): PurchaseOrder
    {
        if ($request->status !== OrderStatus::APPROVED) {
            throw new \InvalidArgumentException('Only approved requests can be converted to purchase orders');
        }
        
        if ($request->purchase_order_id) {
            throw new \InvalidArgumentException('Request has already been converted to purchase order');
        }
        
        \DB::beginTransaction();
        
        try {
            // Create purchase order
            $poData = array_merge([
                'supplier_id' => $request->supplier_id,
                'user_id' => $request->user_id,
                'status' => PurchaseOrderStatus::PENDING,
                'order_date' => now()->format('Y-m-d'),
                'notes' => "Generated from procurement request #{$request->id}\n{$request->justification}"
            ], $additionalData);
            
            $purchaseOrder = $this->createPurchaseOrder($poData, [
                [
                    'product_id' => $request->product_id,
                    'quantity' => $request->requested_quantity,
                    'unit_cost' => $request->estimated_cost,
                    'notes' => "From procurement request #{$request->id}"
                ]
            ]);
            
            // Link request to purchase order
            $request->purchase_order_id = $purchaseOrder->id;
            $request->save();
            
            $this->activityLogger->log(
                'procurement_request.converted_to_po',
                $request->product,
                [
                    'request_id' => $request->id,
                    'purchase_order_id' => $purchaseOrder->id,
                    'po_number' => $purchaseOrder->po_number
                ],
                auth()->user()
            );
            
            \DB::commit();
            
            return $purchaseOrder;
            
        } catch (\Exception $e) {
            \DB::rollBack();
            throw $e;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Reorder Management
    |--------------------------------------------------------------------------
    */

    /**
     * Generate procurement requests for products below reorder point.
     */
    public function generateReorderRequests(\App\Models\User $requestor = null): Collection
    {
        $requestor = $requestor ?? auth()->user();
        
        $requests = ProcurementRequest::generateForLowStockProducts($requestor);
        
        if ($requests->isNotEmpty()) {
            $this->activityLogger->log(
                'reorder.auto_generated',
                null,
                [
                    'requests_count' => $requests->count(),
                    'products' => $requests->pluck('product.name')->toArray()
                ],
                $requestor
            );
            
            // Notify managers about auto-generated requests
            $this->notificationService->sendNotification([
                'type' => 'auto_reorder_generated',
                'message' => "{$requests->count()} automatic reorder requests have been generated",
                'data' => ['request_ids' => $requests->pluck('id')->toArray()],
                'roles' => ['manager']
            ]);
        }
        
        return $requests;
    }

    /**
     * Calculate optimal reorder points for products.
     */
    public function calculateReorderPoints(Collection $products = null): array
    {
        $products = $products ?? Product::active()->get();
        $results = [];
        
        foreach ($products as $product) {
            $currentReorderPoint = $product->reorder_point;
            $calculatedReorderPoint = $this->reorderCalculator->calculateReorderPoint($product);
            
            $results[] = [
                'product' => $product,
                'current_reorder_point' => $currentReorderPoint,
                'calculated_reorder_point' => $calculatedReorderPoint,
                'recommendation' => $this->getReorderPointRecommendation($currentReorderPoint, $calculatedReorderPoint),
                'variance' => $calculatedReorderPoint - $currentReorderPoint,
                'variance_percentage' => $currentReorderPoint > 0 ? 
                    (($calculatedReorderPoint - $currentReorderPoint) / $currentReorderPoint) * 100 : 0
            ];
        }
        
        return $results;
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
            ->where('status', PurchaseOrderStatus::DELIVERED)
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
        $thisMonth = $today->startOfMonth();
        $lastMonth = $today->copy()->subMonth()->startOfMonth();
        
        return [
            'pending_requests' => ProcurementRequest::pending()->count(),
            'urgent_requests' => ProcurementRequest::urgent(4)->count(),
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
                $query->where('status', PurchaseOrderStatus::DELIVERED)
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