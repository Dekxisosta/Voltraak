<?php

namespace App\Modules\Reporting\Services;

use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;
use Illuminate\Support\Collection;

/**
 * Demand forecasting for the manager Forecast page.
 *
 * Demand is the stock-out history of the last HISTORY_WEEKS weeks (reversed
 * stock-outs are ignored). The forecast is a moving-average baseline: each
 * product's average weekly demand, projected flat over the requested window.
 * The page scales that baseline to the selected timeframe itself.
 */
class ForecastService
{
    public const HISTORY_WEEKS = 8;

    private const TREND_THRESHOLD = 0.10;

    /**
     * Per-product forecast rows, in the shape ForecastPage consumes.
     */
    public function getProductForecasts(): array
    {
        $products = $this->activeProducts();
        $weekly = $this->weeklyDemandByProduct();
        $costs = $this->averageUnitCosts($products->pluck('id')->all());

        return $products->map(function (Product $product) use ($weekly, $costs) {
            $series = $weekly[$product->id] ?? array_fill(0, self::HISTORY_WEEKS, 0.0);
            $avgWeekly = array_sum($series) / self::HISTORY_WEEKS;
            $forecast8w = (int) round($avgWeekly * 8);
            $stock = (int) $product->quantity;

            return [
                'id' => $product->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category ?: 'Others',
                'current_stock' => $stock,
                'avg_weekly_demand' => round($avgWeekly, 2),
                'forecast_demand_8w' => $forecast8w,
                'reorder_point' => (int) $product->reorder_level,
                'suggested_order' => max(0, $forecast8w - $stock),
                'unit_cost' => round((float) ($costs[$product->id] ?? $product->unit_price), 2),
                'trend' => $this->trendDirection($series),
                'confidence' => $this->confidence($series),
            ];
        })->values()->all();
    }

    /**
     * Combined weekly demand across all active products: the last
     * HISTORY_WEEKS weeks of actuals followed by $forecastWeeks of forecast.
     * The boundary week (W-1) carries both series so the chart line is
     * continuous.
     */
    public function getDemandTrend(int $forecastWeeks): array
    {
        $productIds = $this->activeProducts()->pluck('id')->all();
        $weekly = $this->weeklyDemandByProduct();

        $actual = array_fill(0, self::HISTORY_WEEKS, 0.0);
        $baseline = 0.0;

        foreach ($productIds as $id) {
            $series = $weekly[$id] ?? null;
            if ($series === null) {
                continue;
            }
            foreach ($series as $i => $qty) {
                $actual[$i] += $qty;
            }
            $baseline += array_sum($series) / self::HISTORY_WEEKS;
        }

        $rows = [];
        foreach ($actual as $i => $qty) {
            $weeksAgo = self::HISTORY_WEEKS - $i;
            $row = ['period' => "W-{$weeksAgo}", 'actual' => (int) round($qty)];

            if ($weeksAgo === 1) {
                $row['forecast'] = $row['actual'];
            }

            $rows[] = $row;
        }

        for ($w = 1; $w <= $forecastWeeks; $w++) {
            $rows[] = ['period' => "W+{$w}", 'forecast' => (int) round($baseline)];
        }

        return $rows;
    }

    /**
     * Parse a timeframe such as "8w" or "30d" into a forecast window in weeks.
     */
    public static function weeksFromTimeframe(?string $timeframe, int $default = 8): int
    {
        if ($timeframe === null || !preg_match('/^(\d{1,3})([wd]?)$/', $timeframe, $m)) {
            return $default;
        }

        $value = (int) $m[1];
        $weeks = $m[2] === 'd' ? (int) ceil($value / 7) : $value;

        return max(1, min(26, $weeks));
    }

    private function activeProducts(): Collection
    {
        return Product::active()->orderBy('name')->get();
    }

    /**
     * @return array<int, float[]> product_id => weekly stock-out quantities, oldest week first
     */
    private function weeklyDemandByProduct(): array
    {
        $days = self::HISTORY_WEEKS * 7;
        $windowStart = now()->startOfDay()->subDays($days - 1);

        $rows = StockTransaction::query()
            ->where('type', StockTransactionType::OUT->value)
            ->where('created_at', '>=', $windowStart)
            ->whereNotIn('id', function ($q) {
                $q->select('reverses_transaction_id')
                    ->from('stock_transactions')
                    ->whereNotNull('reverses_transaction_id');
            })
            ->selectRaw('product_id, DATE(created_at) as day, SUM(quantity) as qty')
            ->groupBy('product_id', 'day')
            ->get();

        $result = [];

        foreach ($rows as $row) {
            $offset = (int) $windowStart->diffInDays(\Carbon\Carbon::parse($row->day)->startOfDay(), false);
            if ($offset < 0 || $offset >= $days) {
                continue;
            }

            $week = intdiv($offset, 7);
            $result[$row->product_id] ??= array_fill(0, self::HISTORY_WEEKS, 0.0);
            $result[$row->product_id][$week] += (float) $row->qty;
        }

        return $result;
    }

    /**
     * Average cost of stock on hand per product; callers fall back to the
     * product's unit price when no batch carries a cost.
     *
     * @return array<int, float>
     */
    private function averageUnitCosts(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }

        return Batch::query()
            ->whereIn('product_id', $productIds)
            ->whereNotNull('unit_cost')
            ->where('quantity', '>', 0)
            ->selectRaw('product_id, AVG(unit_cost) as avg_cost')
            ->groupBy('product_id')
            ->pluck('avg_cost', 'product_id')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    private function trendDirection(array $series): string
    {
        $half = intdiv(self::HISTORY_WEEKS, 2);
        $prior = array_sum(array_slice($series, 0, $half));
        $recent = array_sum(array_slice($series, $half));

        if ($prior <= 0) {
            return $recent > 0 ? 'up' : 'stable';
        }

        $change = ($recent - $prior) / $prior;

        return match (true) {
            $change > self::TREND_THRESHOLD => 'up',
            $change < -self::TREND_THRESHOLD => 'down',
            default => 'stable',
        };
    }

    /**
     * Confidence (0-100) from demand steadiness: the lower the week-to-week
     * variation, the higher the confidence. No history means no basis (0);
     * thin history (under half the window has sales) is capped at 60.
     */
    private function confidence(array $series): int
    {
        $mean = array_sum($series) / count($series);

        if ($mean <= 0) {
            return 0;
        }

        $variance = array_sum(array_map(fn ($v) => ($v - $mean) ** 2, $series)) / count($series);
        $cv = sqrt($variance) / $mean;

        $score = (int) round(max(40, min(98, 100 - $cv * 35)));

        $activeWeeks = count(array_filter($series, fn ($v) => $v > 0));

        return $activeWeeks < self::HISTORY_WEEKS / 2 ? min($score, 60) : $score;
    }
}
