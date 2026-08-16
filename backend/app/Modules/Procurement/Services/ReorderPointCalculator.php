<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;
use Illuminate\Support\Collection;

class ReorderPointCalculator
{
    /*
    |--------------------------------------------------------------------------
    | Reorder Point Calculation
    |--------------------------------------------------------------------------
    |
    | Calculates optimal reorder points using demand forecasting and
    | lead time analysis. Formula: ROP = (Average Daily Demand × Lead Time) + Safety Stock
    |
    */

    /**
     * Calculate reorder point for a product.
     */
    public function calculateReorderPoint(Product $product, int $analysisPeriodDays = 90): int
    {
        // Get demand data
        $demandData = $this->analyzeDemand($product, $analysisPeriodDays);
        
        // Get lead time data
        $leadTimeData = $this->analyzeLeadTime($product);
        
        // Calculate safety stock
        $safetyStock = $this->calculateSafetyStock($demandData, $leadTimeData);
        
        // Calculate reorder point
        $reorderPoint = ($demandData['average_daily_demand'] * $leadTimeData['average_lead_time']) + $safetyStock;
        
        return max(1, round($reorderPoint));
    }

    /**
     * Analyze product demand patterns.
     */
    public function analyzeDemand(Product $product, int $days = 90): array
    {
        $startDate = now()->subDays($days);
        
        // Get stock out transactions (sales/consumption)
        $outTransactions = StockTransaction::where('product_id', $product->id)
            ->where('type', StockTransactionType::OUT)
            ->where('created_at', '>=', $startDate)
            ->orderBy('created_at')
            ->get();
        
        if ($outTransactions->isEmpty()) {
            return [
                'total_demand' => 0,
                'average_daily_demand' => 0,
                'demand_variance' => 0,
                'demand_trend' => 'stable',
                'seasonal_factor' => 1.0,
                'analysis_period' => $days,
                'transaction_count' => 0
            ];
        }
        
        // Calculate daily demand
        $dailyDemands = $this->calculateDailyDemands($outTransactions, $days);
        
        // Calculate statistics
        $totalDemand = $dailyDemands->sum();
        $averageDailyDemand = $dailyDemands->avg();
        $demandVariance = $this->calculateVariance($dailyDemands);
        
        // Analyze trend
        $trend = $this->analyzeDemandTrend($dailyDemands);
        
        // Calculate seasonal factor
        $seasonalFactor = $this->calculateSeasonalFactor($product, $outTransactions);
        
        return [
            'total_demand' => $totalDemand,
            'average_daily_demand' => $averageDailyDemand,
            'demand_variance' => $demandVariance,
            'demand_standard_deviation' => sqrt($demandVariance),
            'demand_trend' => $trend,
            'seasonal_factor' => $seasonalFactor,
            'analysis_period' => $days,
            'transaction_count' => $outTransactions->count(),
            'daily_demands' => $dailyDemands->toArray()
        ];
    }

    /**
     * Calculate daily demands from transactions.
     */
    private function calculateDailyDemands(Collection $transactions, int $days): Collection
    {
        // Group transactions by date
        $dailyTotals = $transactions->groupBy(function ($transaction) {
            return $transaction->created_at->format('Y-m-d');
        })->map(function ($dayTransactions) {
            return $dayTransactions->sum('quantity');
        });
        
        // Fill missing dates with zero demand
        $startDate = now()->subDays($days - 1);
        $fullPeriod = collect();
        
        for ($i = 0; $i < $days; $i++) {
            $date = $startDate->copy()->addDays($i)->format('Y-m-d');
            $fullPeriod->push($dailyTotals->get($date, 0));
        }
        
        return $fullPeriod;
    }

    /**
     * Calculate variance of a collection.
     */
    private function calculateVariance(Collection $values): float
    {
        if ($values->count() < 2) {
            return 0;
        }
        
        $mean = $values->avg();
        $squaredDifferences = $values->map(function ($value) use ($mean) {
            return pow($value - $mean, 2);
        });
        
        return $squaredDifferences->sum() / ($values->count() - 1);
    }

    /**
     * Analyze demand trend (increasing, decreasing, stable).
     */
    private function analyzeDemandTrend(Collection $dailyDemands): string
    {
        if ($dailyDemands->count() < 14) {
            return 'insufficient_data';
        }
        
        // Compare first half vs second half averages
        $halfPoint = $dailyDemands->count() / 2;
        $firstHalf = $dailyDemands->take($halfPoint)->avg();
        $secondHalf = $dailyDemands->skip($halfPoint)->avg();
        
        $percentChange = $firstHalf > 0 ? (($secondHalf - $firstHalf) / $firstHalf) * 100 : 0;
        
        if ($percentChange > 10) {
            return 'increasing';
        } elseif ($percentChange < -10) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    /**
     * Calculate seasonal factor based on historical data.
     */
    private function calculateSeasonalFactor(Product $product, Collection $recentTransactions): float
    {
        // Get same period from previous year for comparison
        $currentPeriodStart = $recentTransactions->first()?->created_at;
        $currentPeriodEnd = $recentTransactions->last()?->created_at;
        
        if (!$currentPeriodStart || !$currentPeriodEnd) {
            return 1.0;
        }
        
        $lastYearStart = $currentPeriodStart->copy()->subYear();
        $lastYearEnd = $currentPeriodEnd->copy()->subYear();
        
        $lastYearTransactions = StockTransaction::where('product_id', $product->id)
            ->where('type', StockTransactionType::OUT)
            ->whereBetween('created_at', [$lastYearStart, $lastYearEnd])
            ->sum('quantity');
        
        $currentPeriodDemand = $recentTransactions->sum('quantity');
        
        if ($lastYearTransactions > 0) {
            return $currentPeriodDemand / $lastYearTransactions;
        }
        
        return 1.0; // No seasonal adjustment if no historical data
    }

    /**
     * Analyze lead time patterns for a product.
     */
    public function analyzeLeadTime(Product $product): array
    {
        // Get recent purchase orders for this product
        $recentPos = \DB::table('purchase_order_items')
            ->join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
            ->where('purchase_order_items.product_id', $product->id)
            ->where('purchase_orders.status', 'delivered')
            ->where('purchase_orders.created_at', '>=', now()->subMonths(12))
            ->select([
                'purchase_orders.order_date',
                'purchase_orders.delivered_at',
                'purchase_orders.expected_delivery_date',
                'purchase_orders.supplier_id'
            ])
            ->get();
        
        if ($recentPos->isEmpty()) {
            // No historical data, use supplier default or system default
            return [
                'average_lead_time' => 7, // Default 1 week
                'lead_time_variance' => 0,
                'reliability_factor' => 1.2, // 20% buffer
                'sample_size' => 0
            ];
        }
        
        // Calculate actual lead times
        $leadTimes = $recentPos->map(function ($po) {
            $orderDate = \Carbon\Carbon::parse($po->order_date);
            $deliveredAt = \Carbon\Carbon::parse($po->delivered_at);
            return $orderDate->diffInDays($deliveredAt);
        });
        
        $averageLeadTime = $leadTimes->avg();
        $leadTimeVariance = $this->calculateVariance($leadTimes);
        
        // Calculate reliability factor based on variance
        $reliabilityFactor = 1 + (sqrt($leadTimeVariance) / $averageLeadTime);
        
        return [
            'average_lead_time' => $averageLeadTime,
            'lead_time_variance' => $leadTimeVariance,
            'lead_time_standard_deviation' => sqrt($leadTimeVariance),
            'reliability_factor' => min(2.0, $reliabilityFactor), // Cap at 2x
            'sample_size' => $recentPos->count()
        ];
    }

    /**
     * Calculate safety stock based on demand and lead time variability.
     */
    public function calculateSafetyStock(array $demandData, array $leadTimeData): float
    {
        // Safety stock formula: Z × √(LT × σD² + D² × σLT²)
        // Where:
        // Z = service level factor (1.65 for 95% service level)
        // LT = average lead time
        // σD = demand standard deviation
        // D = average demand
        // σLT = lead time standard deviation
        
        $serviceLevel = 0.95; // 95% service level
        $zScore = 1.65; // Z-score for 95% service level
        
        $avgLeadTime = $leadTimeData['average_lead_time'];
        $demandStdDev = $demandData['demand_standard_deviation'] ?? 0;
        $avgDemand = $demandData['average_daily_demand'];
        $leadTimeStdDev = $leadTimeData['lead_time_standard_deviation'] ?? 0;
        
        // Calculate safety stock components
        $demandVariabilityComponent = $avgLeadTime * pow($demandStdDev, 2);
        $leadTimeVariabilityComponent = pow($avgDemand, 2) * pow($leadTimeStdDev, 2);
        
        $safetyStock = $zScore * sqrt($demandVariabilityComponent + $leadTimeVariabilityComponent);
        
        return max(0, $safetyStock);
    }

    /**
     * Get reorder point recommendations with different service levels.
     */
    public function getReorderPointRecommendations(Product $product): array
    {
        $demandData = $this->analyzeDemand($product);
        $leadTimeData = $this->analyzeLeadTime($product);
        
        $serviceLevels = [
            85 => 1.04,
            90 => 1.28,
            95 => 1.65,
            98 => 2.05,
            99 => 2.33
        ];
        
        $recommendations = [];
        
        foreach ($serviceLevels as $level => $zScore) {
            $avgLeadTime = $leadTimeData['average_lead_time'];
            $demandStdDev = $demandData['demand_standard_deviation'] ?? 0;
            $avgDemand = $demandData['average_daily_demand'];
            $leadTimeStdDev = $leadTimeData['lead_time_standard_deviation'] ?? 0;
            
            $demandVariabilityComponent = $avgLeadTime * pow($demandStdDev, 2);
            $leadTimeVariabilityComponent = pow($avgDemand, 2) * pow($leadTimeStdDev, 2);
            
            $safetyStock = $zScore * sqrt($demandVariabilityComponent + $leadTimeVariabilityComponent);
            $reorderPoint = ($avgDemand * $avgLeadTime) + $safetyStock;
            
            $recommendations[$level] = [
                'service_level' => $level,
                'reorder_point' => max(1, round($reorderPoint)),
                'safety_stock' => round($safetyStock),
                'expected_stockout_risk' => 100 - $level
            ];
        }
        
        return [
            'current_reorder_point' => $product->reorder_point,
            'demand_analysis' => $demandData,
            'lead_time_analysis' => $leadTimeData,
            'recommendations' => $recommendations,
            'suggested_service_level' => $this->getSuggestedServiceLevel($product, $demandData)
        ];
    }

    /**
     * Get suggested service level based on product characteristics.
     */
    private function getSuggestedServiceLevel(Product $product, array $demandData): int
    {
        // High-value products or fast-moving items should have higher service levels
        $unitValue = $product->unit_cost * $product->selling_price;
        $demandVelocity = $demandData['average_daily_demand'];
        
        if ($unitValue > 1000 || $demandVelocity > 10) {
            return 98; // High service level for critical items
        } elseif ($unitValue > 500 || $demandVelocity > 5) {
            return 95; // Standard service level
        } else {
            return 90; // Lower service level for slow-moving/low-value items
        }
    }

    /**
     * Bulk calculate reorder points for multiple products.
     */
    public function bulkCalculateReorderPoints(Collection $products): Collection
    {
        return $products->map(function (Product $product) {
            return [
                'product' => $product,
                'current_reorder_point' => $product->reorder_point,
                'calculated_reorder_point' => $this->calculateReorderPoint($product),
                'demand_analysis' => $this->analyzeDemand($product, 60), // Shorter period for bulk
                'recommendations' => $this->getReorderPointRecommendations($product)
            ];
        });
    }

    /**
     * Forecast demand for a future period.
     */
    public function forecastDemand(Product $product, int $forecastDays = 30): array
    {
        $demandData = $this->analyzeDemand($product);
        
        // Simple forecast based on trend and seasonality
        $baseForecast = $demandData['average_daily_demand'] * $forecastDays;
        
        // Apply trend adjustment
        $trendMultiplier = match($demandData['demand_trend']) {
            'increasing' => 1.1,
            'decreasing' => 0.9,
            default => 1.0
        };
        
        // Apply seasonal factor
        $seasonalForecast = $baseForecast * $trendMultiplier * $demandData['seasonal_factor'];
        
        // Calculate confidence intervals
        $standardError = sqrt($demandData['demand_variance'] * $forecastDays);
        
        return [
            'forecast_period_days' => $forecastDays,
            'base_forecast' => round($baseForecast),
            'adjusted_forecast' => round($seasonalForecast),
            'confidence_intervals' => [
                '80%' => [
                    'lower' => max(0, round($seasonalForecast - (1.28 * $standardError))),
                    'upper' => round($seasonalForecast + (1.28 * $standardError))
                ],
                '95%' => [
                    'lower' => max(0, round($seasonalForecast - (1.96 * $standardError))),
                    'upper' => round($seasonalForecast + (1.96 * $standardError))
                ]
            ],
            'trend_factor' => $trendMultiplier,
            'seasonal_factor' => $demandData['seasonal_factor'],
            'forecast_accuracy' => $this->estimateForecastAccuracy($demandData)
        ];
    }

    /**
     * Estimate forecast accuracy based on demand variability.
     */
    private function estimateForecastAccuracy(array $demandData): string
    {
        $coefficientOfVariation = $demandData['average_daily_demand'] > 0 
            ? ($demandData['demand_standard_deviation'] / $demandData['average_daily_demand'])
            : 0;
        
        return match(true) {
            $coefficientOfVariation < 0.1 => 'very_high',
            $coefficientOfVariation < 0.2 => 'high',
            $coefficientOfVariation < 0.5 => 'medium',
            $coefficientOfVariation < 1.0 => 'low',
            default => 'very_low'
        };
    }
}