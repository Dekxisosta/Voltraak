<?php

namespace App\Modules\Reporting\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\Supplier;
use App\Support\Enums\StockTransactionType;
use App\Support\Enums\PurchaseOrderStatus;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class AnalyticsService
{
    /*
    |--------------------------------------------------------------------------
    | Key Performance Indicators (KPIs)
    |--------------------------------------------------------------------------
    */

    /**
     * Get comprehensive inventory KPIs.
     */
    public function getInventoryKPIs(Carbon $startDate = null, Carbon $endDate = null): array
    {
        $startDate = $startDate ?? now()->subDays(30);
        $endDate = $endDate ?? now();

        return [
            'accuracy' => $this->calculateInventoryAccuracy($startDate, $endDate),
            'turnover' => $this->calculateInventoryTurnover($startDate, $endDate),
            'shrinkage' => $this->calculateShrinkageRate($startDate, $endDate),
            'stockout_rate' => $this->calculateStockoutRate($startDate, $endDate),
            'carrying_cost' => $this->calculateCarryingCost(),
            'service_level' => $this->calculateServiceLevel($startDate, $endDate),
            'fefo_compliance' => $this->calculateFEFOCompliance($startDate, $endDate),
            'expiry_waste' => $this->calculateExpiryWaste($startDate, $endDate)
        ];
    }

    /**
     * Calculate inventory accuracy percentage.
     */
    public function calculateInventoryAccuracy(Carbon $startDate, Carbon $endDate): array
    {
        $physicalCounts = PhysicalCount::whereBetween('count_date', [$startDate, $endDate])->get();
        
        if ($physicalCounts->isEmpty()) {
            return [
                'percentage' => null,
                'total_counts' => 0,
                'accurate_counts' => 0,
                'variance_value' => 0
            ];
        }

        $totalCounts = $physicalCounts->count();
        $accurateCounts = $physicalCounts->filter(function ($count) {
            return abs($count->variance_percentage) <= 5; // 5% tolerance
        })->count();

        $totalVarianceValue = $physicalCounts->sum(function ($count) {
            return abs($count->variance * ($count->product->unit_cost ?? 0));
        });

        return [
            'percentage' => round(($accurateCounts / $totalCounts) * 100, 2),
            'total_counts' => $totalCounts,
            'accurate_counts' => $accurateCounts,
            'variance_value' => $totalVarianceValue,
            'target' => 98.0 // Target: ≥98% accuracy
        ];
    }

    /**
     * Calculate inventory turnover rate.
     */
    public function calculateInventoryTurnover(Carbon $startDate, Carbon $endDate): array
    {
        // Cost of Goods Sold (COGS) from stock out transactions
        $cogs = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('quantity * unit_cost'));

        // Average inventory value
        $currentInventoryValue = Product::sum(\DB::raw('current_quantity * unit_cost'));
        
        // Simplified average inventory (would need more historical data for precise calculation)
        $averageInventoryValue = $currentInventoryValue;

        $turnoverRate = $averageInventoryValue > 0 ? $cogs / $averageInventoryValue : 0;
        $daysSalesInventory = $turnoverRate > 0 ? 365 / $turnoverRate : 0;

        return [
            'turnover_rate' => round($turnoverRate, 2),
            'days_sales_inventory' => round($daysSalesInventory, 1),
            'cogs' => $cogs,
            'average_inventory_value' => $averageInventoryValue,
            'target_turnover' => 12.0 // Target: 12x per year
        ];
    }

    /**
     * Calculate shrinkage rate.
     */
    public function calculateShrinkageRate(Carbon $startDate, Carbon $endDate): array
    {
        // Get adjustment transactions (shrinkage indicators)
        $shrinkageTransactions = StockTransaction::where('type', StockTransactionType::ADJUSTMENT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('quantity', '<', 0) // Negative adjustments indicate shrinkage
            ->get();

        $totalShrinkageQuantity = abs($shrinkageTransactions->sum('quantity'));
        $totalShrinkageValue = $shrinkageTransactions->sum(function ($transaction) {
            return abs($transaction->quantity * $transaction->unit_cost);
        });

        // Total inventory value (for percentage calculation)
        $totalInventoryValue = Product::sum(\DB::raw('current_quantity * unit_cost'));

        $shrinkageRate = $totalInventoryValue > 0 ? 
            ($totalShrinkageValue / $totalInventoryValue) * 100 : 0;

        return [
            'rate_percentage' => round($shrinkageRate, 2),
            'total_quantity' => $totalShrinkageQuantity,
            'total_value' => $totalShrinkageValue,
            'transaction_count' => $shrinkageTransactions->count(),
            'target' => 5.0 // Target: <5% shrinkage rate
        ];
    }

    /**
     * Calculate stockout rate.
     */
    public function calculateStockoutRate(Carbon $startDate, Carbon $endDate): array
    {
        $totalProducts = Product::where('is_active', true)->count();
        $stockoutProducts = Product::where('is_active', true)
            ->where('current_quantity', '<=', 0)
            ->count();

        // Historical stockout events (products that went to zero during period)
        $stockoutEvents = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereHas('product', function ($query) {
                $query->where('current_quantity', '<=', 0);
            })
            ->distinct('product_id')
            ->count();

        return [
            'current_rate' => $totalProducts > 0 ? round(($stockoutProducts / $totalProducts) * 100, 2) : 0,
            'stockout_events' => $stockoutEvents,
            'affected_products' => $stockoutProducts,
            'total_active_products' => $totalProducts,
            'target' => 2.0 // Target: <2% stockout rate
        ];
    }

    /**
     * Calculate carrying cost.
     */
    public function calculateCarryingCost(): array
    {
        $totalInventoryValue = Product::sum(\DB::raw('current_quantity * unit_cost'));
        
        // Estimated carrying cost components (configurable rates)
        $storageRate = 0.15; // 15% for storage, insurance, etc.
        $capitalRate = 0.08; // 8% cost of capital
        $obsolescenceRate = 0.05; // 5% for obsolescence risk
        
        $totalCarryingRate = $storageRate + $capitalRate + $obsolescenceRate;
        $annualCarryingCost = $totalInventoryValue * $totalCarryingRate;

        return [
            'annual_carrying_cost' => $annualCarryingCost,
            'monthly_carrying_cost' => $annualCarryingCost / 12,
            'carrying_rate_percentage' => $totalCarryingRate * 100,
            'inventory_value' => $totalInventoryValue,
            'cost_breakdown' => [
                'storage_insurance' => $totalInventoryValue * $storageRate,
                'cost_of_capital' => $totalInventoryValue * $capitalRate,
                'obsolescence_risk' => $totalInventoryValue * $obsolescenceRate
            ]
        ];
    }

    /**
     * Calculate service level.
     */
    public function calculateServiceLevel(Carbon $startDate, Carbon $endDate): array
    {
        // Service level = (Total Demand - Stockouts) / Total Demand
        $totalDemand = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('quantity');

        // Approximation: stockout quantity as demand that couldn't be fulfilled
        $stockoutQuantity = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereHas('product', function ($query) {
                $query->where('current_quantity', '<=', 0);
            })
            ->sum('quantity');

        $serviceLevel = $totalDemand > 0 ? 
            ((($totalDemand - $stockoutQuantity) / $totalDemand) * 100) : 100;

        return [
            'service_level_percentage' => round($serviceLevel, 2),
            'fulfilled_demand' => $totalDemand - $stockoutQuantity,
            'total_demand' => $totalDemand,
            'stockout_quantity' => $stockoutQuantity,
            'target' => 95.0 // Target: ≥95% service level
        ];
    }

    /**
     * Calculate FEFO compliance rate.
     */
    public function calculateFEFOCompliance(Carbon $startDate, Carbon $endDate): array
    {
        // Get all stock out transactions in the period
        $outTransactions = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('batch_id')
            ->with(['batch'])
            ->get();

        if ($outTransactions->isEmpty()) {
            return [
                'compliance_rate' => 100.0,
                'total_transactions' => 0,
                'compliant_transactions' => 0,
                'violations' => []
            ];
        }

        $violations = [];
        $compliantTransactions = 0;

        foreach ($outTransactions as $transaction) {
            $batch = $transaction->batch;
            if (!$batch) continue;

            // Check if there were older batches available at time of transaction
            $olderBatches = Batch::where('product_id', $batch->product_id)
                ->where('id', '!=', $batch->id)
                ->where('expiry_date', '<', $batch->expiry_date)
                ->where('current_quantity', '>', 0)
                ->exists();

            if ($olderBatches) {
                $violations[] = [
                    'transaction_id' => $transaction->id,
                    'batch_code' => $batch->batch_code,
                    'product_name' => $batch->product->name ?? 'Unknown',
                    'quantity' => $transaction->quantity,
                    'date' => $transaction->created_at->format('Y-m-d H:i:s')
                ];
            } else {
                $compliantTransactions++;
            }
        }

        $complianceRate = ($compliantTransactions / $outTransactions->count()) * 100;

        return [
            'compliance_rate' => round($complianceRate, 2),
            'total_transactions' => $outTransactions->count(),
            'compliant_transactions' => $compliantTransactions,
            'violations' => $violations,
            'target' => 95.0 // Target: ≥95% FEFO compliance
        ];
    }

    /**
     * Calculate expiry waste.
     */
    public function calculateExpiryWaste(Carbon $startDate, Carbon $endDate): array
    {
        // Get expired batches with remaining quantity
        $expiredBatches = Batch::where('expiry_date', '<', now())
            ->where('current_quantity', '>', 0)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with('product')
            ->get();

        $totalWasteQuantity = $expiredBatches->sum('current_quantity');
        $totalWasteValue = $expiredBatches->sum(function ($batch) {
            return $batch->current_quantity * $batch->unit_cost;
        });

        $wasteByProduct = $expiredBatches->groupBy('product_id')->map(function ($batches) {
            return [
                'product_name' => $batches->first()->product->name ?? 'Unknown',
                'total_quantity' => $batches->sum('current_quantity'),
                'total_value' => $batches->sum(function ($batch) {
                    return $batch->current_quantity * $batch->unit_cost;
                }),
                'batch_count' => $batches->count()
            ];
        });

        return [
            'total_waste_value' => $totalWasteValue,
            'total_waste_quantity' => $totalWasteQuantity,
            'expired_batch_count' => $expiredBatches->count(),
            'waste_by_product' => $wasteByProduct->values()->toArray(),
            'target' => 15000.0 // Target: <₱15,000 per incident
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Procurement Analytics
    |--------------------------------------------------------------------------
    */

    /**
     * Get procurement performance metrics.
     */
    public function getProcurementKPIs(Carbon $startDate = null, Carbon $endDate = null): array
    {
        $startDate = $startDate ?? now()->subDays(30);
        $endDate = $endDate ?? now();

        return [
            'supplier_performance' => $this->calculateSupplierPerformance($startDate, $endDate),
            'purchase_order_cycle_time' => $this->calculatePOCycleTime($startDate, $endDate),
            'cost_savings' => $this->calculateCostSavings($startDate, $endDate),
            'delivery_performance' => $this->calculateDeliveryPerformance($startDate, $endDate),
            'supplier_diversity' => $this->calculateSupplierDiversity($startDate, $endDate)
        ];
    }

    /**
     * Calculate overall supplier performance.
     */
    public function calculateSupplierPerformance(Carbon $startDate, Carbon $endDate): array
    {
        $suppliers = Supplier::whereHas('purchaseOrders', function ($query) use ($startDate, $endDate) {
            $query->whereBetween('order_date', [$startDate, $endDate]);
        })->with(['purchaseOrders' => function ($query) use ($startDate, $endDate) {
            $query->whereBetween('order_date', [$startDate, $endDate]);
        }])->get();

        $performanceData = $suppliers->map(function ($supplier) {
            $orders = $supplier->purchaseOrders;
            $totalOrders = $orders->count();
            $deliveredOrders = $orders->where('status', PurchaseOrderStatus::DELIVERED)->count();
            
            $onTimeDeliveries = $orders->filter(function ($order) {
                return $order->delivered_at && 
                       $order->expected_delivery_date &&
                       $order->delivered_at->lte($order->expected_delivery_date);
            })->count();

            $completionRate = $totalOrders > 0 ? ($deliveredOrders / $totalOrders) * 100 : 0;
            $onTimeRate = $deliveredOrders > 0 ? ($onTimeDeliveries / $deliveredOrders) * 100 : 0;

            return [
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'total_orders' => $totalOrders,
                'completion_rate' => round($completionRate, 2),
                'on_time_delivery_rate' => round($onTimeRate, 2),
                'total_order_value' => $orders->sum('total_amount')
            ];
        });

        $avgCompletionRate = $performanceData->avg('completion_rate');
        $avgOnTimeRate = $performanceData->avg('on_time_delivery_rate');

        return [
            'average_completion_rate' => round($avgCompletionRate, 2),
            'average_on_time_rate' => round($avgOnTimeRate, 2),
            'supplier_count' => $suppliers->count(),
            'top_performers' => $performanceData->sortByDesc('on_time_delivery_rate')->take(5)->values()->toArray(),
            'performance_by_supplier' => $performanceData->toArray()
        ];
    }

    /**
     * Calculate purchase order cycle time.
     */
    public function calculatePOCycleTime(Carbon $startDate, Carbon $endDate): array
    {
        $completedPOs = PurchaseOrder::where('status', PurchaseOrderStatus::DELIVERED)
            ->whereBetween('order_date', [$startDate, $endDate])
            ->whereNotNull('delivered_at')
            ->get();

        if ($completedPOs->isEmpty()) {
            return [
                'average_cycle_time_days' => 0,
                'median_cycle_time_days' => 0,
                'fastest_delivery_days' => 0,
                'slowest_delivery_days' => 0,
                'total_orders' => 0
            ];
        }

        $cycleTimes = $completedPOs->map(function ($po) {
            return Carbon::parse($po->order_date)->diffInDays($po->delivered_at);
        });

        return [
            'average_cycle_time_days' => round($cycleTimes->avg(), 1),
            'median_cycle_time_days' => $cycleTimes->median(),
            'fastest_delivery_days' => $cycleTimes->min(),
            'slowest_delivery_days' => $cycleTimes->max(),
            'total_orders' => $completedPOs->count(),
            'cycle_time_distribution' => $this->getCycleTimeDistribution($cycleTimes)
        ];
    }

    /**
     * Get cycle time distribution.
     */
    private function getCycleTimeDistribution(Collection $cycleTimes): array
    {
        return [
            '0-7_days' => $cycleTimes->filter(fn($time) => $time <= 7)->count(),
            '8-14_days' => $cycleTimes->filter(fn($time) => $time > 7 && $time <= 14)->count(),
            '15-21_days' => $cycleTimes->filter(fn($time) => $time > 14 && $time <= 21)->count(),
            '22+_days' => $cycleTimes->filter(fn($time) => $time > 21)->count()
        ];
    }

    /**
     * Calculate cost savings (placeholder - would need baseline pricing).
     */
    public function calculateCostSavings(Carbon $startDate, Carbon $endDate): array
    {
        // This would require historical pricing data to calculate actual savings
        // For now, return structure for future implementation
        return [
            'total_savings' => 0,
            'savings_percentage' => 0,
            'savings_by_category' => [],
            'negotiation_impact' => 0
        ];
    }

    /**
     * Calculate delivery performance metrics.
     */
    public function calculateDeliveryPerformance(Carbon $startDate, Carbon $endDate): array
    {
        $deliveredOrders = PurchaseOrder::where('status', PurchaseOrderStatus::DELIVERED)
            ->whereBetween('order_date', [$startDate, $endDate])
            ->whereNotNull('delivered_at')
            ->whereNotNull('expected_delivery_date')
            ->get();

        if ($deliveredOrders->isEmpty()) {
            return [
                'on_time_percentage' => 0,
                'early_delivery_percentage' => 0,
                'late_delivery_percentage' => 0,
                'average_delay_days' => 0,
                'total_deliveries' => 0
            ];
        }

        $onTime = $deliveredOrders->filter(function ($order) {
            return $order->delivered_at->lte($order->expected_delivery_date);
        })->count();

        $early = $deliveredOrders->filter(function ($order) {
            return $order->delivered_at->lt($order->expected_delivery_date);
        })->count();

        $late = $deliveredOrders->filter(function ($order) {
            return $order->delivered_at->gt($order->expected_delivery_date);
        })->count();

        $delays = $deliveredOrders->filter(function ($order) {
            return $order->delivered_at->gt($order->expected_delivery_date);
        })->map(function ($order) {
            return $order->expected_delivery_date->diffInDays($order->delivered_at);
        });

        $avgDelay = $delays->isNotEmpty() ? $delays->avg() : 0;
        $totalDeliveries = $deliveredOrders->count();

        return [
            'on_time_percentage' => round(($onTime / $totalDeliveries) * 100, 2),
            'early_delivery_percentage' => round(($early / $totalDeliveries) * 100, 2),
            'late_delivery_percentage' => round(($late / $totalDeliveries) * 100, 2),
            'average_delay_days' => round($avgDelay, 1),
            'total_deliveries' => $totalDeliveries
        ];
    }

    /**
     * Calculate supplier diversity metrics.
     */
    public function calculateSupplierDiversity(Carbon $startDate, Carbon $endDate): array
    {
        $totalSpend = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::DELIVERED])
            ->sum('total_amount');

        $spendBySupplier = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::DELIVERED])
            ->groupBy('supplier_id')
            ->selectRaw('supplier_id, SUM(total_amount) as spend')
            ->with('supplier:id,name')
            ->get();

        $supplierConcentration = $spendBySupplier->map(function ($item) use ($totalSpend) {
            return [
                'supplier_name' => $item->supplier->name ?? 'Unknown',
                'spend_amount' => $item->spend,
                'spend_percentage' => $totalSpend > 0 ? round(($item->spend / $totalSpend) * 100, 2) : 0
            ];
        })->sortByDesc('spend_amount')->values();

        // Calculate concentration risk (top 3 suppliers' share)
        $top3Share = $supplierConcentration->take(3)->sum('spend_percentage');

        return [
            'total_suppliers' => $spendBySupplier->count(),
            'total_spend' => $totalSpend,
            'top_3_concentration' => $top3Share,
            'supplier_breakdown' => $supplierConcentration->toArray(),
            'concentration_risk' => $top3Share > 70 ? 'high' : ($top3Share > 50 ? 'medium' : 'low')
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Trend Analysis
    |--------------------------------------------------------------------------
    */

    /**
     * Get inventory trends over time.
     */
    public function getInventoryTrends(Carbon $startDate, Carbon $endDate, string $interval = 'daily'): array
    {
        $dateFormat = match($interval) {
            'hourly' => '%Y-%m-%d %H:00:00',
            'daily' => '%Y-%m-%d',
            'weekly' => '%Y-%u',
            'monthly' => '%Y-%m',
            default => '%Y-%m-%d'
        };

        $stockMovements = StockTransaction::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("DATE_FORMAT(created_at, '{$dateFormat}') as period")
            ->selectRaw('type')
            ->selectRaw('SUM(quantity) as total_quantity')
            ->selectRaw('COUNT(*) as transaction_count')
            ->groupBy('period', 'type')
            ->orderBy('period')
            ->get()
            ->groupBy('period');

        $trends = [];
        foreach ($stockMovements as $period => $movements) {
            $stockIn = $movements->where('type', StockTransactionType::IN)->sum('total_quantity');
            $stockOut = $movements->where('type', StockTransactionType::OUT)->sum('total_quantity');
            $adjustments = $movements->where('type', StockTransactionType::ADJUSTMENT)->sum('total_quantity');

            $trends[] = [
                'period' => $period,
                'stock_in' => $stockIn,
                'stock_out' => $stockOut,
                'adjustments' => $adjustments,
                'net_movement' => $stockIn - $stockOut + $adjustments,
                'transaction_count' => $movements->sum('transaction_count')
            ];
        }

        return $trends;
    }

    /**
     * Get ABC analysis of products.
     */
    public function getABCAnalysis(): array
    {
        $products = Product::where('is_active', true)
            ->selectRaw('id, name, sku, unit_cost, current_quantity, (unit_cost * current_quantity) as total_value')
            ->orderBy('total_value', 'desc')
            ->get();

        $totalValue = $products->sum('total_value');
        $runningValue = 0;
        
        $analysis = $products->map(function ($product) use ($totalValue, &$runningValue) {
            $runningValue += $product->total_value;
            $cumulativePercentage = $totalValue > 0 ? ($runningValue / $totalValue) * 100 : 0;
            
            $category = match(true) {
                $cumulativePercentage <= 80 => 'A',
                $cumulativePercentage <= 95 => 'B',
                default => 'C'
            };

            return [
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'total_value' => $product->total_value,
                'cumulative_percentage' => round($cumulativePercentage, 2),
                'category' => $category
            ];
        });

        $categoryStats = [
            'A' => $analysis->where('category', 'A'),
            'B' => $analysis->where('category', 'B'),
            'C' => $analysis->where('category', 'C')
        ];

        return [
            'total_products' => $products->count(),
            'total_value' => $totalValue,
            'category_breakdown' => [
                'A' => [
                    'count' => $categoryStats['A']->count(),
                    'percentage' => round(($categoryStats['A']->count() / $products->count()) * 100, 2),
                    'value_percentage' => round(($categoryStats['A']->sum('total_value') / $totalValue) * 100, 2)
                ],
                'B' => [
                    'count' => $categoryStats['B']->count(),
                    'percentage' => round(($categoryStats['B']->count() / $products->count()) * 100, 2),
                    'value_percentage' => round(($categoryStats['B']->sum('total_value') / $totalValue) * 100, 2)
                ],
                'C' => [
                    'count' => $categoryStats['C']->count(),
                    'percentage' => round(($categoryStats['C']->count() / $products->count()) * 100, 2),
                    'value_percentage' => round(($categoryStats['C']->sum('total_value') / $totalValue) * 100, 2)
                ]
            ],
            'products' => $analysis->toArray()
        ];
    }
}