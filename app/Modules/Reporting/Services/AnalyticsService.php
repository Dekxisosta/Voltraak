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
            return abs($count->variance * ($count->product->unit_price ?? 0));
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

        // Current inventory value
        $currentInventoryValue = Product::sum(\DB::raw('quantity * unit_price'));
        
        // Use average inventory (simplified - would need opening inventory for precision)
        $averageInventoryValue = $currentInventoryValue; // TODO: Implement historical average

        // Annualise the turnover calculation
        $periodDays = $startDate->diffInDays($endDate);
        $annualizedCogs = $periodDays > 0 ? $cogs * (365 / $periodDays) : 0;

        $turnoverRate = $averageInventoryValue > 0 ? $annualizedCogs / $averageInventoryValue : 0;
        $daysSalesInventory = $turnoverRate > 0 ? 365 / $turnoverRate : 0;

        return [
            'turnover_rate' => round($turnoverRate, 2),
            'days_sales_inventory' => round($daysSalesInventory, 1),
            'cogs' => $cogs,
            'annualized_cogs' => $annualizedCogs,
            'average_inventory_value' => $averageInventoryValue,
            'target_turnover' => 12.0 // Target: 12x per year
        ];
    }

    /**
     * Calculate shrinkage rate.
     */
    public function calculateShrinkageRate(Carbon $startDate, Carbon $endDate): array
    {
        // Get adjustment transactions (shrinkage indicators) - P1 made adjustments signed
        $shrinkageTransactions = StockTransaction::where('type', StockTransactionType::ADJUSTMENT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('quantity', '<', 0) // Negative adjustments indicate shrinkage (signed values)
            ->get();

        $totalShrinkageQuantity = abs($shrinkageTransactions->sum('quantity'));
        $totalShrinkageValue = $shrinkageTransactions->sum(function ($transaction) {
            return abs($transaction->quantity * $transaction->unit_cost);
        });

        // Calculate period movement for denominator (not total inventory value)
        $periodMovementValue = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('quantity * unit_cost'));

        $shrinkageRate = $periodMovementValue > 0 ? 
            ($totalShrinkageValue / $periodMovementValue) * 100 : 0;

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
            ->where('quantity', '<=', 0)
            ->count();

        // Historical stockout events - only count products that were denied/cancelled due to stock
        // Do not count orders with status 'completed' as unmet demand
        $stockoutEvents = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereHas('product', function ($query) {
                $query->where('quantity', '<=', 0);
            })
            ->where('reference_type', '!=', 'completed_sale') // Exclude completed sales
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
        $totalInventoryValue = Product::sum(\DB::raw('quantity * unit_price'));
        
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

        // Only count demand that was explicitly denied or cancelled due to stock, not completed sales
        $stockoutQuantity = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereHas('product', function ($query) {
                $query->where('quantity', '<=', 0);
            })
            ->where('reference_type', '!=', 'completed_sale') // Exclude completed sales
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
        // Get all stock out transactions in the period with batch info
        $outTransactions = StockTransaction::where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('batch_id')
            ->with(['batch.product', 'batch' => function($query) use ($startDate) {
                // Eager load batch comparisons to avoid N+1 queries
                $query->with(['product.batches' => function($batchQuery) use ($startDate) {
                    $batchQuery->where('quantity', '>', 0)
                           ->where('created_at', '<=', $startDate);
                }]);
            }])
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
            if (!$batch || !$batch->product) continue;

            // Use eager loaded batches to check for older alternatives
            $olderBatches = $batch->product->batches->filter(function($otherBatch) use ($batch, $transaction) {
                return $otherBatch->id !== $batch->id 
                    && $otherBatch->expiry_date < $batch->expiry_date
                    && $otherBatch->quantity > 0
                    && $otherBatch->created_at <= $transaction->created_at;
            });

            if ($olderBatches->isNotEmpty()) {
                $violations[] = [
                    'transaction_id' => $transaction->id,
                    'batch_code' => $batch->batch_number,
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
        // Get adjustment transactions with batch_expiry reference type (set by P1)
        $expiryWasteTransactions = StockTransaction::where('type', StockTransactionType::ADJUSTMENT)
            ->where('reference_type', 'batch_expiry')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['product', 'batch'])
            ->get();

        $totalWasteQuantity = abs($expiryWasteTransactions->sum('quantity'));
        $totalWasteValue = $expiryWasteTransactions->sum(function ($transaction) {
            return abs($transaction->quantity * $transaction->unit_cost);
        });

        $wasteByProduct = $expiryWasteTransactions->groupBy('product_id')->map(function ($transactions) {
            $firstTransaction = $transactions->first();
            return [
                'product_name' => $firstTransaction->product->name ?? 'Unknown',
                'total_quantity' => abs($transactions->sum('quantity')),
                'total_value' => $transactions->sum(function ($transaction) {
                    return abs($transaction->quantity * $transaction->unit_cost);
                }),
                'transaction_count' => $transactions->count()
            ];
        });

        return [
            'total_waste_value' => $totalWasteValue,
            'total_waste_quantity' => $totalWasteQuantity,
            'expired_transaction_count' => $expiryWasteTransactions->count(),
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
            $deliveredOrders = $orders->whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])->count();
            
            $onTimeDeliveries = $orders->filter(function ($order) {
                return $order->actual_delivery_date && 
                       $order->expected_delivery_date &&
                       $order->actual_delivery_date->lte($order->expected_delivery_date);
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
        $completedPOs = PurchaseOrder::whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->whereNotNull('actual_delivery_date')
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
            return Carbon::parse($po->order_date)->diffInDays($po->actual_delivery_date);
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
        // TODO: Implement with baseline pricing data to calculate actual savings
        return [
            'total_savings' => 0, // TODO: Implement with baseline pricing data
            'savings_percentage' => 0, // TODO: Calculate vs historical pricing
            'savings_by_category' => [], // TODO: Group by product categories  
            'negotiation_impact' => 0, // TODO: Track negotiated vs list prices
            'implementation_status' => 'not_implemented'
        ];
    }

    /**
     * Calculate delivery performance metrics.
     */
    public function calculateDeliveryPerformance(Carbon $startDate, Carbon $endDate): array
    {
        $deliveredOrders = PurchaseOrder::whereIn('status', [PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->whereNotNull('actual_delivery_date')
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
            return $order->actual_delivery_date->lte($order->expected_delivery_date);
        })->count();

        $early = $deliveredOrders->filter(function ($order) {
            return $order->actual_delivery_date->lt($order->expected_delivery_date);
        })->count();

        $late = $deliveredOrders->filter(function ($order) {
            return $order->actual_delivery_date->gt($order->expected_delivery_date);
        })->count();

        $delays = $deliveredOrders->filter(function ($order) {
            return $order->actual_delivery_date->gt($order->expected_delivery_date);
        })->map(function ($order) {
            return $order->expected_delivery_date->diffInDays($order->actual_delivery_date);
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
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
            ->sum('total_amount');

        $spendBySupplier = PurchaseOrder::whereBetween('order_date', [$startDate, $endDate])
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::RECEIVED, PurchaseOrderStatus::COMPLETED])
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
                'net_movement' => $stockIn - $stockOut + $adjustments, // Use signed quantity values
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
            ->selectRaw('id, name, sku, unit_price, quantity, (unit_price * quantity) as total_value')
            ->orderBy('total_value', 'desc')
            ->get();

        // Guard against empty products
        if ($products->isEmpty()) {
            return [
                'total_products' => 0,
                'total_value' => 0,
                'category_breakdown' => [
                    'A' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                    'B' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                    'C' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0]
                ],
                'products' => []
            ];
        }

        $totalValue = $products->sum('total_value');
        
        // Guard against zero total value
        if ($totalValue == 0) {
            // All products have zero value - assign evenly to C category
            return [
                'total_products' => $products->count(),
                'total_value' => 0,
                'category_breakdown' => [
                    'A' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                    'B' => ['count' => 0, 'percentage' => 0, 'value_percentage' => 0],
                    'C' => ['count' => $products->count(), 'percentage' => 100, 'value_percentage' => 0]
                ],
                'products' => $products->map(function ($product) {
                    return [
                        'product_id' => $product->id,
                        'name' => $product->name,
                        'sku' => $product->sku,
                        'total_value' => 0,
                        'cumulative_percentage' => 0,
                        'category' => 'C'
                    ];
                })->toArray()
            ];
        }

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
                    'percentage' => $products->count() > 0 ? round(($categoryStats['A']->count() / $products->count()) * 100, 2) : 0,
                    'value_percentage' => $totalValue > 0 ? round(($categoryStats['A']->sum('total_value') / $totalValue) * 100, 2) : 0
                ],
                'B' => [
                    'count' => $categoryStats['B']->count(),
                    'percentage' => $products->count() > 0 ? round(($categoryStats['B']->count() / $products->count()) * 100, 2) : 0,
                    'value_percentage' => $totalValue > 0 ? round(($categoryStats['B']->sum('total_value') / $totalValue) * 100, 2) : 0
                ],
                'C' => [
                    'count' => $categoryStats['C']->count(),
                    'percentage' => $products->count() > 0 ? round(($categoryStats['C']->count() / $products->count()) * 100, 2) : 0,
                    'value_percentage' => $totalValue > 0 ? round(($categoryStats['C']->sum('total_value') / $totalValue) * 100, 2) : 0
                ]
            ],
            'products' => $analysis->toArray()
        ];
    }
}