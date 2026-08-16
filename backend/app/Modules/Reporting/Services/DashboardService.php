<?php

namespace App\Modules\Reporting\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\ProcurementRequest;
use App\Support\Enums\PurchaseOrderStatus;
use App\Support\Enums\OrderStatus;
use App\Support\Enums\BatchStatus;
use Carbon\Carbon;

class DashboardService
{
    public function __construct(
        private AnalyticsService $analyticsService
    ) {}

    /*
    |--------------------------------------------------------------------------
    | Executive Dashboard
    |--------------------------------------------------------------------------
    */

    /**
     * Get executive dashboard overview.
     */
    public function getExecutiveDashboard(): array
    {
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth();

        return [
            'key_metrics' => $this->getKeyMetrics(),
            'alerts' => $this->getCriticalAlerts(),
            'trends' => $this->getExecutiveTrends($lastMonth, $today),
            'performance_summary' => $this->getPerformanceSummary(),
            'financial_overview' => $this->getFinancialOverview($thisMonth, $today)
        ];
    }

    /**
     * Get key performance metrics.
     */
    private function getKeyMetrics(): array
    {
        $inventoryKPIs = $this->analyticsService->getInventoryKPIs();
        $procurementKPIs = $this->analyticsService->getProcurementKPIs();

        return [
            'inventory_accuracy' => [
                'value' => $inventoryKPIs['accuracy']['percentage'] ?? 0,
                'target' => 98.0,
                'status' => $this->getMetricStatus($inventoryKPIs['accuracy']['percentage'] ?? 0, 98.0),
                'unit' => '%'
            ],
            'shrinkage_rate' => [
                'value' => $inventoryKPIs['shrinkage']['rate_percentage'] ?? 0,
                'target' => 5.0,
                'status' => $this->getMetricStatus(5.0, $inventoryKPIs['shrinkage']['rate_percentage'] ?? 0), // Lower is better
                'unit' => '%'
            ],
            'service_level' => [
                'value' => $inventoryKPIs['service_level']['service_level_percentage'] ?? 0,
                'target' => 95.0,
                'status' => $this->getMetricStatus($inventoryKPIs['service_level']['service_level_percentage'] ?? 0, 95.0),
                'unit' => '%'
            ],
            'supplier_performance' => [
                'value' => $procurementKPIs['supplier_performance']['average_on_time_rate'] ?? 0,
                'target' => 90.0,
                'status' => $this->getMetricStatus($procurementKPIs['supplier_performance']['average_on_time_rate'] ?? 0, 90.0),
                'unit' => '%'
            ]
        ];
    }

    /**
     * Get metric status (excellent, good, warning, critical).
     */
    private function getMetricStatus(float $value, float $target): string
    {
        $ratio = $value / $target;
        
        return match(true) {
            $ratio >= 1.0 => 'excellent',
            $ratio >= 0.9 => 'good',
            $ratio >= 0.8 => 'warning',
            default => 'critical'
        };
    }

    /**
     * Get critical alerts requiring immediate attention.
     */
    private function getCriticalAlerts(): array
    {
        $alerts = [];

        // Critical stock alerts
        $outOfStockCount = Product::where('is_active', true)
            ->where('current_quantity', '<=', 0)
            ->count();

        if ($outOfStockCount > 0) {
            $alerts[] = [
                'type' => 'stockout',
                'severity' => 'critical',
                'title' => 'Products Out of Stock',
                'message' => "{$outOfStockCount} products are currently out of stock",
                'action_url' => '/inventory/products?status=out_of_stock',
                'count' => $outOfStockCount
            ];
        }

        // Low stock alerts
        $lowStockCount = Product::whereRaw('current_quantity <= reorder_point')
            ->where('reorder_point', '>', 0)
            ->where('current_quantity', '>', 0)
            ->count();

        if ($lowStockCount > 0) {
            $alerts[] = [
                'type' => 'low_stock',
                'severity' => 'warning',
                'title' => 'Low Stock Alert',
                'message' => "{$lowStockCount} products are below reorder point",
                'action_url' => '/inventory/products?status=low_stock',
                'count' => $lowStockCount
            ];
        }

        // Expiring batches
        $expiringBatchesCount = Batch::where('expiry_date', '<=', Carbon::now()->addDays(30))
            ->where('current_quantity', '>', 0)
            ->count();

        if ($expiringBatchesCount > 0) {
            $alerts[] = [
                'type' => 'expiring_batches',
                'severity' => 'warning',
                'title' => 'Batches Expiring Soon',
                'message' => "{$expiringBatchesCount} batches expire within 30 days",
                'action_url' => '/inventory/batches?status=expiring_soon',
                'count' => $expiringBatchesCount
            ];
        }

        // Expired batches with stock
        $expiredBatchesCount = Batch::where('expiry_date', '<', Carbon::now())
            ->where('current_quantity', '>', 0)
            ->count();

        if ($expiredBatchesCount > 0) {
            $alerts[] = [
                'type' => 'expired_batches',
                'severity' => 'critical',
                'title' => 'Expired Batches with Stock',
                'message' => "{$expiredBatchesCount} expired batches still have inventory",
                'action_url' => '/inventory/batches?status=expired',
                'count' => $expiredBatchesCount
            ];
        }

        // Overdue purchase orders
        $overduePOsCount = PurchaseOrder::where('expected_delivery_date', '<', Carbon::now())
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT])
            ->count();

        if ($overduePOsCount > 0) {
            $alerts[] = [
                'type' => 'overdue_orders',
                'severity' => 'warning',
                'title' => 'Overdue Purchase Orders',
                'message' => "{$overduePOsCount} purchase orders are past due",
                'action_url' => '/procurement/purchase-orders?status=overdue',
                'count' => $overduePOsCount
            ];
        }

        // Pending procurement requests
        $pendingRequestsCount = ProcurementRequest::where('status', OrderStatus::PENDING)
            ->where('urgency_level', '>=', 3)
            ->count();

        if ($pendingRequestsCount > 0) {
            $alerts[] = [
                'type' => 'pending_requests',
                'severity' => 'warning',
                'title' => 'Urgent Procurement Requests',
                'message' => "{$pendingRequestsCount} urgent requests awaiting approval",
                'action_url' => '/procurement/requests?status=pending&urgent=true',
                'count' => $pendingRequestsCount
            ];
        }

        return array_slice($alerts, 0, 10); // Limit to 10 most critical alerts
    }

    /**
     * Get executive trends.
     */
    private function getExecutiveTrends(Carbon $startDate, Carbon $endDate): array
    {
        $inventoryTrends = $this->analyticsService->getInventoryTrends($startDate, $endDate, 'daily');
        
        // Calculate trend indicators
        $recentDays = array_slice($inventoryTrends, -7); // Last 7 days
        $totalStockIn = array_sum(array_column($recentDays, 'stock_in'));
        $totalStockOut = array_sum(array_column($recentDays, 'stock_out'));
        
        return [
            'inventory_movement' => [
                'stock_in_trend' => $this->calculateTrend($recentDays, 'stock_in'),
                'stock_out_trend' => $this->calculateTrend($recentDays, 'stock_out'),
                'net_movement' => $totalStockIn - $totalStockOut
            ],
            'purchase_orders' => [
                'total_value_trend' => $this->getPurchaseOrderTrend($startDate, $endDate),
                'completion_rate_trend' => $this->getPOCompletionTrend($startDate, $endDate)
            ],
            'accuracy_trend' => $this->getAccuracyTrend($startDate, $endDate)
        ];
    }

    /**
     * Calculate trend direction (up, down, stable).
     */
    private function calculateTrend(array $data, string $field): string
    {
        if (count($data) < 2) return 'stable';
        
        $firstHalf = array_slice($data, 0, ceil(count($data) / 2));
        $secondHalf = array_slice($data, ceil(count($data) / 2));
        
        $firstAvg = array_sum(array_column($firstHalf, $field)) / count($firstHalf);
        $secondAvg = array_sum(array_column($secondHalf, $field)) / count($secondHalf);
        
        $change = $firstAvg > 0 ? (($secondAvg - $firstAvg) / $firstAvg) * 100 : 0;
        
        return match(true) {
            $change > 5 => 'up',
            $change < -5 => 'down',
            default => 'stable'
        };
    }

    /**
     * Get purchase order trend.
     */
    private function getPurchaseOrderTrend(Carbon $startDate, Carbon $endDate): string
    {
        $currentPeriodValue = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->sum('total_amount');
            
        $previousPeriodStart = $startDate->copy()->subDays($startDate->diffInDays($endDate));
        $previousPeriodValue = PurchaseOrder::whereBetween('order_date', [$previousPeriodStart, $startDate])
            ->sum('total_amount');
        
        if ($previousPeriodValue == 0) return 'stable';
        
        $change = (($currentPeriodValue - $previousPeriodValue) / $previousPeriodValue) * 100;
        
        return match(true) {
            $change > 10 => 'up',
            $change < -10 => 'down',
            default => 'stable'
        };
    }

    /**
     * Get purchase order completion trend.
     */
    private function getPOCompletionTrend(Carbon $startDate, Carbon $endDate): string
    {
        // Calculate completion rate for current and previous periods
        $currentPeriodTotal = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])->count();
        $currentPeriodCompleted = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->where('status', PurchaseOrderStatus::DELIVERED)
            ->count();
            
        $currentRate = $currentPeriodTotal > 0 ? ($currentPeriodCompleted / $currentPeriodTotal) * 100 : 0;
        
        $previousPeriodStart = $startDate->copy()->subDays($startDate->diffInDays($endDate));
        $previousPeriodTotal = PurchaseOrder::whereBetween('order_date', [$previousPeriodStart, $startDate])->count();
        $previousPeriodCompleted = PurchaseOrder::whereBetween('order_date', [$previousPeriodStart, $startDate])
            ->where('status', PurchaseOrderStatus::DELIVERED)
            ->count();
            
        $previousRate = $previousPeriodTotal > 0 ? ($previousPeriodCompleted / $previousPeriodTotal) * 100 : 0;
        
        $change = $previousRate > 0 ? (($currentRate - $previousRate) / $previousRate) * 100 : 0;
        
        return match(true) {
            $change > 5 => 'up',
            $change < -5 => 'down',
            default => 'stable'
        };
    }

    /**
     * Get accuracy trend.
     */
    private function getAccuracyTrend(Carbon $startDate, Carbon $endDate): string
    {
        // This would require historical accuracy data
        // For now, return stable
        return 'stable';
    }

    /**
     * Get performance summary.
     */
    private function getPerformanceSummary(): array
    {
        $totalProducts = Product::where('is_active', true)->count();
        $totalSuppliers = \App\Modules\Procurement\Models\Supplier::where('is_active', true)->count();
        $totalInventoryValue = Product::sum(\DB::raw('current_quantity * unit_cost'));
        
        return [
            'total_products' => $totalProducts,
            'total_suppliers' => $totalSuppliers,
            'inventory_value' => $totalInventoryValue,
            'monthly_transactions' => StockTransaction::where('created_at', '>=', Carbon::now()->startOfMonth())->count(),
            'accuracy_rate' => $this->analyticsService->calculateInventoryAccuracy(
                Carbon::now()->subDays(30), 
                Carbon::now()
            )['percentage'] ?? 0
        ];
    }

    /**
     * Get financial overview.
     */
    private function getFinancialOverview(Carbon $startDate, Carbon $endDate): array
    {
        $purchaseOrderValue = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::DELIVERED])
            ->sum('total_amount');
            
        $carryingCost = $this->analyticsService->calculateCarryingCost();
        $expiryWaste = $this->analyticsService->calculateExpiryWaste($startDate, $endDate);
        
        return [
            'monthly_procurement_spend' => $purchaseOrderValue,
            'carrying_cost' => $carryingCost['monthly_carrying_cost'],
            'expiry_waste_value' => $expiryWaste['total_waste_value'],
            'total_inventory_value' => Product::sum(\DB::raw('current_quantity * unit_cost'))
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Manager Dashboard
    |--------------------------------------------------------------------------
    */

    /**
     * Get manager dashboard.
     */
    public function getManagerDashboard(): array
    {
        return [
            'operational_metrics' => $this->getOperationalMetrics(),
            'pending_approvals' => $this->getPendingApprovals(),
            'recent_activities' => $this->getRecentActivities(),
            'inventory_alerts' => $this->getInventoryAlerts(),
            'procurement_summary' => $this->getProcurementSummary(),
            'performance_charts' => $this->getPerformanceCharts()
        ];
    }

    /**
     * Get operational metrics for managers.
     */
    private function getOperationalMetrics(): array
    {
        $today = Carbon::today();
        $thisWeek = Carbon::now()->startOfWeek();
        
        return [
            'daily_transactions' => StockTransaction::whereDate('created_at', $today)->count(),
            'weekly_physical_counts' => \App\Modules\Inventory\Models\PhysicalCount::where('count_date', '>=', $thisWeek)->count(),
            'pending_pos' => PurchaseOrder::where('status', PurchaseOrderStatus::PENDING)->count(),
            'low_stock_products' => Product::whereRaw('current_quantity <= reorder_point')->where('reorder_point', '>', 0)->count(),
            'accuracy_this_week' => $this->getWeeklyAccuracy($thisWeek),
            'fefo_violations' => $this->getRecentFEFOViolations()
        ];
    }

    /**
     * Get weekly accuracy.
     */
    private function getWeeklyAccuracy(Carbon $startOfWeek): float
    {
        $counts = \App\Modules\Inventory\Models\PhysicalCount::where('count_date', '>=', $startOfWeek)->get();
        
        if ($counts->isEmpty()) return 0;
        
        $accurateCount = $counts->filter(function ($count) {
            return abs($count->variance_percentage) <= 5;
        })->count();
        
        return round(($accurateCount / $counts->count()) * 100, 2);
    }

    /**
     * Get recent FEFO violations.
     */
    private function getRecentFEFOViolations(): int
    {
        $fefoAnalysis = $this->analyticsService->calculateFEFOCompliance(Carbon::now()->subDays(7), Carbon::now());
        return count($fefoAnalysis['violations'] ?? []);
    }

    /**
     * Get pending approvals.
     */
    private function getPendingApprovals(): array
    {
        return [
            'procurement_requests' => ProcurementRequest::where('status', OrderStatus::PENDING)->count(),
            'purchase_orders' => PurchaseOrder::where('status', PurchaseOrderStatus::PENDING)->count(),
            'variance_adjustments' => $this->getPendingVarianceAdjustments()
        ];
    }

    /**
     * Get pending variance adjustments.
     */
    private function getPendingVarianceAdjustments(): int
    {
        return \App\Modules\Inventory\Models\PhysicalCount::where('created_at', '>=', Carbon::now()->subDays(7))
            ->whereRaw('ABS(variance_percentage) > 5')
            ->count();
    }

    /**
     * Get recent activities.
     */
    private function getRecentActivities(): array
    {
        // This would fetch from activity log
        // For now, return recent transactions
        $recentTransactions = StockTransaction::with(['product', 'user'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($transaction) {
                return [
                    'type' => 'stock_transaction',
                    'description' => "{$transaction->type} - {$transaction->quantity} units of {$transaction->product->name ?? 'Unknown'}",
                    'user' => $transaction->user->name ?? 'System',
                    'timestamp' => $transaction->created_at,
                    'details' => [
                        'transaction_id' => $transaction->id,
                        'product_name' => $transaction->product->name ?? 'Unknown',
                        'quantity' => $transaction->quantity,
                        'type' => $transaction->type
                    ]
                ];
            });

        return $recentTransactions->toArray();
    }

    /**
     * Get inventory alerts for managers.
     */
    private function getInventoryAlerts(): array
    {
        $alerts = $this->getCriticalAlerts();
        
        // Filter to most relevant for managers
        return collect($alerts)->filter(function ($alert) {
            return in_array($alert['type'], ['stockout', 'low_stock', 'expiring_batches', 'pending_requests']);
        })->take(5)->values()->toArray();
    }

    /**
     * Get procurement summary.
     */
    private function getProcurementSummary(): array
    {
        $thisMonth = Carbon::now()->startOfMonth();
        
        return [
            'monthly_spend' => PurchaseOrder::whereBetween('order_date', [$thisMonth, Carbon::now()])
                ->sum('total_amount'),
            'orders_this_month' => PurchaseOrder::whereBetween('order_date', [$thisMonth, Carbon::now()])
                ->count(),
            'supplier_performance' => $this->analyticsService->getProcurementKPIs()['supplier_performance']['average_on_time_rate'] ?? 0,
            'pending_deliveries' => PurchaseOrder::where('status', PurchaseOrderStatus::SENT)
                ->where('expected_delivery_date', '>=', Carbon::now())
                ->count()
        ];
    }

    /**
     * Get performance charts data.
     */
    private function getPerformanceCharts(): array
    {
        $last30Days = Carbon::now()->subDays(30);
        
        return [
            'inventory_movements' => $this->analyticsService->getInventoryTrends($last30Days, Carbon::now(), 'daily'),
            'accuracy_trend' => $this->getAccuracyTrendData($last30Days),
            'top_moving_products' => $this->getTopMovingProducts(),
            'supplier_performance' => $this->getSupplierPerformanceChart()
        ];
    }

    /**
     * Get accuracy trend data.
     */
    private function getAccuracyTrendData(Carbon $startDate): array
    {
        // Weekly accuracy over the last 30 days
        $weeks = [];
        for ($i = 0; $i < 4; $i++) {
            $weekStart = $startDate->copy()->addWeeks($i);
            $weekEnd = $weekStart->copy()->addWeek();
            
            $accuracy = $this->getWeeklyAccuracy($weekStart);
            
            $weeks[] = [
                'week' => $weekStart->format('M d'),
                'accuracy' => $accuracy
            ];
        }
        
        return $weeks;
    }

    /**
     * Get top moving products.
     */
    private function getTopMovingProducts(): array
    {
        $last30Days = Carbon::now()->subDays(30);
        
        return StockTransaction::where('type', StockTransactionType::OUT)
            ->where('created_at', '>=', $last30Days)
            ->selectRaw('product_id, SUM(quantity) as total_quantity')
            ->with('product:id,name,sku')
            ->groupBy('product_id')
            ->orderBy('total_quantity', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'product_name' => $item->product->name ?? 'Unknown',
                    'sku' => $item->product->sku ?? '',
                    'total_quantity' => $item->total_quantity
                ];
            })
            ->toArray();
    }

    /**
     * Get supplier performance chart data.
     */
    private function getSupplierPerformanceChart(): array
    {
        $suppliers = \App\Modules\Procurement\Models\Supplier::whereHas('purchaseOrders', function ($query) {
            $query->where('created_at', '>=', Carbon::now()->subDays(90));
        })
        ->with(['purchaseOrders' => function ($query) {
            $query->where('created_at', '>=', Carbon::now()->subDays(90));
        }])
        ->get();

        return $suppliers->map(function ($supplier) {
            $orders = $supplier->purchaseOrders;
            $deliveredOrders = $orders->where('status', PurchaseOrderStatus::DELIVERED);
            
            $onTimeDeliveries = $deliveredOrders->filter(function ($order) {
                return $order->delivered_at && 
                       $order->expected_delivery_date &&
                       $order->delivered_at->lte($order->expected_delivery_date);
            });

            return [
                'supplier_name' => $supplier->name,
                'on_time_rate' => $deliveredOrders->count() > 0 ? 
                    round(($onTimeDeliveries->count() / $deliveredOrders->count()) * 100, 2) : 0,
                'total_orders' => $orders->count(),
                'total_value' => $orders->sum('total_amount')
            ];
        })
        ->sortByDesc('on_time_rate')
        ->take(10)
        ->values()
        ->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | Staff Dashboard (Inventory & Warehouse)
    |--------------------------------------------------------------------------
    */

    /**
     * Get staff dashboard (simplified view for inventory and warehouse staff).
     */
    public function getStaffDashboard(): array
    {
        return [
            'daily_tasks' => $this->getDailyTasks(),
            'quick_stats' => $this->getQuickStats(),
            'urgent_items' => $this->getUrgentItems(),
            'recent_transactions' => $this->getRecentTransactions(),
            'batch_alerts' => $this->getBatchAlerts()
        ];
    }

    /**
     * Get daily tasks for staff.
     */
    private function getDailyTasks(): array
    {
        $today = Carbon::today();
        
        return [
            'physical_counts_due' => $this->getPhysicalCountsDue(),
            'expiring_batches_today' => Batch::whereDate('expiry_date', $today)
                ->where('current_quantity', '>', 0)
                ->count(),
            'low_stock_check' => Product::whereRaw('current_quantity <= reorder_point')
                ->where('reorder_point', '>', 0)
                ->count(),
            'pending_stock_ins' => $this->getPendingStockIns()
        ];
    }

    /**
     * Get physical counts due.
     */
    private function getPhysicalCountsDue(): int
    {
        // Products that haven't been counted in the last 30 days
        $cutoffDate = Carbon::now()->subDays(30);
        
        $recentlyCounted = \App\Modules\Inventory\Models\PhysicalCount::where('count_date', '>=', $cutoffDate)
            ->distinct('product_id')
            ->pluck('product_id');
            
        return Product::where('is_active', true)
            ->whereNotIn('id', $recentlyCounted)
            ->count();
    }

    /**
     * Get pending stock ins (deliveries expected).
     */
    private function getPendingStockIns(): int
    {
        return PurchaseOrder::where('status', PurchaseOrderStatus::SENT)
            ->where('expected_delivery_date', '<=', Carbon::now()->addDays(3))
            ->count();
    }

    /**
     * Get quick stats for staff.
     */
    private function getQuickStats(): array
    {
        $today = Carbon::today();
        
        return [
            'todays_transactions' => StockTransaction::whereDate('created_at', $today)->count(),
            'products_in_stock' => Product::where('current_quantity', '>', 0)->count(),
            'total_products' => Product::where('is_active', true)->count(),
            'batches_available' => Batch::where('status', BatchStatus::AVAILABLE)->count()
        ];
    }

    /**
     * Get urgent items requiring attention.
     */
    private function getUrgentItems(): array
    {
        $urgentItems = [];
        
        // Out of stock items
        $outOfStock = Product::where('is_active', true)
            ->where('current_quantity', '<=', 0)
            ->limit(5)
            ->get(['id', 'name', 'sku', 'current_quantity']);
            
        foreach ($outOfStock as $product) {
            $urgentItems[] = [
                'type' => 'out_of_stock',
                'priority' => 'critical',
                'item' => $product->name,
                'sku' => $product->sku,
                'message' => 'Out of stock'
            ];
        }
        
        // Expired batches with stock
        $expiredBatches = Batch::where('expiry_date', '<', Carbon::now())
            ->where('current_quantity', '>', 0)
            ->with('product:id,name')
            ->limit(5)
            ->get();
            
        foreach ($expiredBatches as $batch) {
            $urgentItems[] = [
                'type' => 'expired_batch',
                'priority' => 'critical',
                'item' => $batch->product->name ?? 'Unknown',
                'batch_code' => $batch->batch_code,
                'message' => 'Expired batch with stock',
                'quantity' => $batch->current_quantity
            ];
        }
        
        return array_slice($urgentItems, 0, 10);
    }

    /**
     * Get recent transactions for staff view.
     */
    private function getRecentTransactions(): array
    {
        return StockTransaction::with(['product:id,name,sku', 'batch:id,batch_code'])
            ->latest()
            ->limit(15)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type->value,
                    'product_name' => $transaction->product->name ?? 'Unknown',
                    'sku' => $transaction->product->sku ?? '',
                    'batch_code' => $transaction->batch->batch_code ?? null,
                    'quantity' => $transaction->quantity,
                    'timestamp' => $transaction->created_at,
                    'time_ago' => $transaction->created_at->diffForHumans()
                ];
            })
            ->toArray();
    }

    /**
     * Get batch alerts for staff.
     */
    private function getBatchAlerts(): array
    {
        $alerts = [];
        
        // Batches expiring in next 7 days
        $expiringSoon = Batch::whereBetween('expiry_date', [Carbon::now(), Carbon::now()->addDays(7)])
            ->where('current_quantity', '>', 0)
            ->with('product:id,name')
            ->get();
            
        foreach ($expiringSoon as $batch) {
            $daysToExpiry = Carbon::now()->diffInDays($batch->expiry_date, false);
            $alerts[] = [
                'type' => 'expiring_soon',
                'batch_code' => $batch->batch_code,
                'product_name' => $batch->product->name ?? 'Unknown',
                'expiry_date' => $batch->expiry_date,
                'days_to_expiry' => $daysToExpiry,
                'quantity' => $batch->current_quantity,
                'priority' => $daysToExpiry <= 3 ? 'high' : 'medium'
            ];
        }
        
        return collect($alerts)->sortBy('days_to_expiry')->take(10)->values()->toArray();
    }
}