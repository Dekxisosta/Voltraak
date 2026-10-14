<?php

namespace App\Modules\Reporting\Services;

use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;

/**
 * Low-stock alerts for the manager Low Stock and KPI pages.
 *
 * Single source of truth for "what counts as low stock" so the KPI card, the
 * critical-stock watchlist and the Low Stock page always agree. The definition
 * matches DashboardService: an active product with a reorder level whose
 * on-hand quantity is at or below that level (out-of-stock products with a
 * reorder level are included).
 */
class LowStockService
{
    /** Days of stock-out history used to derive average daily sales. */
    public const DEMAND_WINDOW_DAYS = 30;

    /** At or below this many days of cover a low product is "critical". */
    public const CRITICAL_DAYS = 7;

    /**
     * Alert rows in the shape LowStockPage consumes, most urgent first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAlerts(): array
    {
        $products = Product::query()
            ->active()
            ->where('reorder_level', '>', 0)
            ->whereColumn('quantity', '<=', 'reorder_level')
            ->orderBy('name')
            ->get();

        if ($products->isEmpty()) {
            return [];
        }

        $dailyDemand = $this->averageDailyDemand($products->pluck('id')->all());

        $alerts = $products
            ->map(fn (Product $product) => $this->toAlert($product, $dailyDemand[$product->id] ?? 0.0))
            ->all();

        usort($alerts, function (array $a, array $b) {
            return [$this->urgencyRank($a['status']), $a['days_until_stockout'] ?? PHP_INT_MAX, $a['product_name']]
                <=> [$this->urgencyRank($b['status']), $b['days_until_stockout'] ?? PHP_INT_MAX, $b['product_name']];
        });

        return array_values($alerts);
    }

    private function toAlert(Product $product, float $dailyDemand): array
    {
        $stock = max(0, (int) $product->quantity);
        $reorderPoint = (int) $product->reorder_level;

        // There is no minimum-stock column; the safety floor is half the
        // reorder point.
        $minimumStock = intdiv($reorderPoint, 2);

        // Days of cover at the recent sales rate. null = no recent sales, so
        // cover cannot be estimated (the page shows a dash).
        $daysUntilStockout = $stock <= 0
            ? 0
            : ($dailyDemand > 0 ? (int) floor($stock / $dailyDemand) : null);

        $status = match (true) {
            $stock <= 0 => 'out_of_stock',
            $stock <= $minimumStock,
            $daysUntilStockout !== null && $daysUntilStockout <= self::CRITICAL_DAYS => 'critical',
            default => 'low',
        };

        // Same fallback the procurement reorder generator uses: restock up to
        // twice the reorder point (or the product's max level when set).
        $target = (int) $product->max_stock_level > 0
            ? (int) $product->max_stock_level
            : $reorderPoint * 2;

        return [
            'id' => $product->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'current_stock' => $stock,
            'reorder_point' => $reorderPoint,
            'minimum_stock' => $minimumStock,
            'avg_daily_sales' => round($dailyDemand, 2),
            'days_until_stockout' => $daysUntilStockout,
            'status' => $status,
            'suggested_order_qty' => max(1, $target - $stock),
            'unit_cost' => $this->suggestedUnitCost($product),
        ];
    }

    /**
     * Cost to prefill on a reorder: what the most recent batch cost, falling
     * back to the product's price when it has never been received.
     */
    private function suggestedUnitCost(Product $product): float
    {
        $cost = $product->batches()->whereNotNull('unit_cost')->latest('id')->value('unit_cost');

        return round((float) ($cost ?? $product->unit_price ?? 0), 2);
    }

    private function urgencyRank(string $status): int
    {
        return match ($status) {
            'out_of_stock' => 0,
            'critical' => 1,
            default => 2,
        };
    }

    /**
     * Average units sold per day over the demand window. Reversed stock-outs
     * are ignored, matching ForecastService.
     *
     * @param  array<int, int>  $productIds
     * @return array<int, float> product_id => units per day
     */
    private function averageDailyDemand(array $productIds): array
    {
        $since = now()->startOfDay()->subDays(self::DEMAND_WINDOW_DAYS - 1);

        return StockTransaction::query()
            ->whereIn('product_id', $productIds)
            ->where('type', StockTransactionType::OUT->value)
            ->where('created_at', '>=', $since)
            ->whereNotIn('id', function ($q) {
                $q->select('reverses_transaction_id')
                    ->from('stock_transactions')
                    ->whereNotNull('reverses_transaction_id');
            })
            ->selectRaw('product_id, SUM(quantity) as qty')
            ->groupBy('product_id')
            ->pluck('qty', 'product_id')
            ->map(fn ($qty) => (float) $qty / self::DEMAND_WINDOW_DAYS)
            ->all();
    }
}
