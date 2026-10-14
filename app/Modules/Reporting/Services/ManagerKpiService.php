<?php

namespace App\Modules\Reporting\Services;

use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Support\Enums\BatchStatus;
use App\Support\Enums\PurchaseOrderStatus;
use App\Support\Enums\StockTransactionType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Builds the payload the manager KPI Dashboard page reads.
 *
 * The generic /dashboard/kpis endpoint returns raw analytics ({ inventory,
 * procurement }); this service reshapes and complements it into the
 * { metrics, trends, categoryBreakdown, alerts, pendingApprovals,
 * movementSummary, topMovers, criticalStock } structure KPIDashboardPage
 * consumes.
 */
class ManagerKpiService
{
    /** Months shown on the stock value trend (including the current one). */
    private const TREND_MONTHS = 6;

    /** Purchase orders at or above this amount are flagged high priority. */
    private const HIGH_VALUE_PO_THRESHOLD = 500000;

    /** Category slices shown before the rest are folded into "Others". */
    private const MAX_CATEGORIES = 4;

    private const CATEGORY_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

    private const OTHERS_COLOR = '#94a3b8';

    public function __construct(
        private AnalyticsService $analyticsService,
        private LowStockService $lowStockService
    ) {}

    /**
     * Parse a "7d" / "30d" / "90d" timeframe into days.
     */
    public static function daysFromTimeframe(?string $timeframe, int $default = 30): int
    {
        if ($timeframe !== null && preg_match('/^(\d{1,3})d$/', $timeframe, $m)) {
            return max(1, (int) $m[1]);
        }

        return $default;
    }

    public function getDashboard(int $days = 30): array
    {
        $end = Carbon::now();
        $start = $end->copy()->subDays($days);

        $kpis = $this->analyticsService->getInventoryKPIs($start, $end);
        $lowStock = $this->lowStockService->getAlerts();

        $activeProducts = Product::query()->active();
        $totalSkus = (clone $activeProducts)->count();
        $stockValue = (float) (clone $activeProducts)->sum(DB::raw('quantity * unit_price'));

        $trend = $this->stockValueTrend($stockValue);

        return [
            'metrics' => [
                'totalSKUs' => $totalSkus,
                'stockValue' => round($stockValue, 2),
                'lowStockItems' => count($lowStock),
                'shrinkageRate' => (float) ($kpis['shrinkage']['rate_percentage'] ?? 0),
                // Null when there were no physical counts in the window.
                'inventoryAccuracy' => $kpis['accuracy']['percentage'] ?? null,
                'turnoverRate' => (float) ($kpis['turnover']['turnover_rate'] ?? 0),
                'serviceLevel' => (float) ($kpis['service_level']['service_level_percentage'] ?? 0),
                'fefoCompliance' => (float) ($kpis['fefo_compliance']['compliance_rate'] ?? 0),
            ],
            'changes' => [
                'newSkusThisMonth' => (clone $activeProducts)
                    ->where('created_at', '>=', Carbon::now()->startOfMonth())
                    ->count(),
                'stockValueChangePct' => $this->monthOverMonthChange($trend),
            ],
            'trends' => [
                'stockValue' => $trend,
            ],
            'categoryBreakdown' => $this->categoryBreakdown(),
            'alerts' => $this->alerts($lowStock),
            'pendingApprovals' => $this->pendingApprovals(),
            'movementSummary' => $this->movementSummary($start, $end),
            'topMovers' => $this->topMovers($start, $end),
            'criticalStock' => $this->criticalStock($lowStock),
        ];
    }

    /**
     * Stock value at the end of each of the last TREND_MONTHS months, as
     * [{ period: 'Aug 2026', value }]. Past values are reconstructed by
     * rolling today's value back through the stock ledger, valued at current
     * unit prices so every point is on the same basis as the headline number.
     */
    private function stockValueTrend(float $currentValue): array
    {
        $now = Carbon::now();
        $firstMonthEnd = $now->copy()->startOfMonth()->subMonths(self::TREND_MONTHS - 1)->endOfMonth();

        $signedQuantity = "CASE stock_transactions.type
            WHEN 'in' THEN stock_transactions.quantity
            WHEN 'return' THEN stock_transactions.quantity
            WHEN 'out' THEN -stock_transactions.quantity
            WHEN 'adjustment' THEN stock_transactions.quantity
            ELSE 0 END";

        $dailyDeltas = StockTransaction::query()
            ->join('products', 'products.id', '=', 'stock_transactions.product_id')
            ->where('products.is_active', true)
            ->whereNull('products.deleted_at')
            ->where('stock_transactions.created_at', '>', $firstMonthEnd)
            ->selectRaw("DATE(stock_transactions.created_at) as day, SUM(({$signedQuantity}) * products.unit_price) as delta_value")
            ->groupBy('day')
            ->get();

        $trend = [];

        for ($i = self::TREND_MONTHS - 1; $i >= 0; $i--) {
            $month = $now->copy()->startOfMonth()->subMonths($i);

            if ($i === 0) {
                $value = $currentValue;
            } else {
                $cutoff = $month->copy()->endOfMonth()->toDateString();
                $after = $dailyDeltas
                    ->filter(fn ($row) => (string) $row->day > $cutoff)
                    ->sum(fn ($row) => (float) $row->delta_value);
                $value = max(0, $currentValue - $after);
            }

            $trend[] = [
                'period' => $month->format('M Y'),
                'value' => round($value, 2),
            ];
        }

        return $trend;
    }

    private function monthOverMonthChange(array $trend): ?float
    {
        if (count($trend) < 2) {
            return null;
        }

        $previous = $trend[count($trend) - 2]['value'];
        $current = $trend[count($trend) - 1]['value'];

        return $previous > 0 ? round((($current - $previous) / $previous) * 100, 1) : null;
    }

    /**
     * Share of stock value per category, as [{ category, value (percent), color }].
     */
    private function categoryBreakdown(): array
    {
        $totals = Product::query()
            ->active()
            ->get(['category', 'quantity', 'unit_price'])
            ->groupBy(fn ($p) => $p->category ?: 'Others')
            ->map(fn ($group) => (float) $group->sum(fn ($p) => $p->quantity * $p->unit_price))
            ->sortDesc();

        $grandTotal = $totals->sum();

        if ($grandTotal <= 0) {
            return [];
        }

        $named = $totals->except('Others');
        $top = $named->take(self::MAX_CATEGORIES);
        $othersValue = $named->skip(self::MAX_CATEGORIES)->sum() + ($totals['Others'] ?? 0);

        $rows = [];
        $index = 0;

        foreach ($top as $category => $value) {
            $rows[] = [
                'category' => (string) $category,
                'value' => round(($value / $grandTotal) * 100, 1),
                'color' => self::CATEGORY_COLORS[$index++ % count(self::CATEGORY_COLORS)],
            ];
        }

        if ($othersValue > 0) {
            $rows[] = [
                'category' => 'Others',
                'value' => round(($othersValue / $grandTotal) * 100, 1),
                'color' => self::OTHERS_COLOR,
            ];
        }

        return $rows;
    }

    /**
     * Active alerts as [{ id, type: critical|warning, title, message }].
     */
    private function alerts(array $lowStock): array
    {
        $alerts = [];

        $outOfStock = Product::query()->active()->where('quantity', '<=', 0)->count();
        if ($outOfStock > 0) {
            $alerts[] = [
                'type' => 'critical',
                'title' => 'Products Out of Stock',
                'message' => "{$outOfStock} " . ($outOfStock === 1 ? 'product is' : 'products are') . ' currently out of stock',
            ];
        }

        $lowCount = count($lowStock);
        if ($lowCount > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Low Stock Alert',
                'message' => "{$lowCount} " . ($lowCount === 1 ? 'product is' : 'products are') . ' at or below reorder point',
            ];
        }

        $expiring = Batch::query()
            ->where('status', BatchStatus::WARNING->value)
            ->where('quantity', '>', 0)
            ->count();
        if ($expiring > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'Expiring Batches',
                'message' => "{$expiring} " . ($expiring === 1 ? 'batch is' : 'batches are') . ' nearing expiry and need priority sale',
            ];
        }

        return array_map(
            fn (array $alert, int $i) => ['id' => $i + 1] + $alert,
            $alerts,
            array_keys($alerts)
        );
    }

    /**
     * Purchase orders awaiting manager approval.
     */
    private function pendingApprovals(): array
    {
        $pending = PurchaseOrder::query()
            ->with('supplier:id,name')
            ->where('status', PurchaseOrderStatus::PENDING->value);

        $count = (clone $pending)->count();
        $totalValue = (float) (clone $pending)->sum('total_amount');

        $items = (clone $pending)
            ->orderByDesc('total_amount')
            ->limit(5)
            ->get()
            ->map(fn (PurchaseOrder $po) => [
                'id' => $po->id,
                'poNumber' => $po->po_number,
                'supplier' => $po->supplier?->name ?? 'Unknown supplier',
                'amount' => (float) $po->total_amount,
                'priority' => (float) $po->total_amount >= self::HIGH_VALUE_PO_THRESHOLD ? 'high' : 'medium',
            ])
            ->values()
            ->all();

        return [
            'count' => $count,
            'totalValue' => round($totalValue, 2),
            'items' => $items,
        ];
    }

    /**
     * Units moved in the window. Adjustments are signed in the ledger, so
     * "adjustments" is the magnitude of the net adjustment and netChange is
     * the true net movement (can be negative).
     */
    private function movementSummary(Carbon $start, Carbon $end): array
    {
        $totals = StockTransaction::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('type, SUM(quantity) as qty')
            ->groupBy('type')
            ->get()
            // Raw value: the model casts `type` to an enum, which we don't want here.
            ->mapWithKeys(fn ($row) => [$row->getRawOriginal('type') => (int) $row->qty]);

        $in = (int) ($totals[StockTransactionType::IN->value] ?? 0)
            + (int) ($totals[StockTransactionType::RETURN->value] ?? 0);
        $out = (int) ($totals[StockTransactionType::OUT->value] ?? 0);
        $adjustment = (int) ($totals[StockTransactionType::ADJUSTMENT->value] ?? 0);

        return [
            'stockIn' => $in,
            'stockOut' => $out,
            'adjustments' => abs($adjustment),
            'netChange' => $in - $out + $adjustment,
        ];
    }

    /**
     * Best-selling products by revenue (units out x current unit price),
     * ignoring stock-outs that were later reversed.
     */
    private function topMovers(Carbon $start, Carbon $end): array
    {
        return StockTransaction::query()
            ->join('products', 'products.id', '=', 'stock_transactions.product_id')
            ->where('stock_transactions.type', StockTransactionType::OUT->value)
            ->whereBetween('stock_transactions.created_at', [$start, $end])
            ->whereNotIn('stock_transactions.id', function ($q) {
                $q->select('reverses_transaction_id')
                    ->from('stock_transactions')
                    ->whereNotNull('reverses_transaction_id');
            })
            ->groupBy('products.id', 'products.name')
            ->selectRaw('products.name as name, SUM(stock_transactions.quantity) as units_sold, SUM(stock_transactions.quantity * products.unit_price) as revenue')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'unitsSold' => (int) $row->units_sold,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * Most urgent low-stock products (already ordered most urgent first).
     */
    private function criticalStock(array $lowStock): array
    {
        return collect($lowStock)
            ->whereIn('status', ['out_of_stock', 'critical'])
            ->take(4)
            ->map(fn (array $a) => [
                'id' => $a['id'],
                'productName' => $a['product_name'],
                'sku' => $a['sku'],
                'status' => $a['status'],
                'daysUntilStockout' => $a['days_until_stockout'],
            ])
            ->values()
            ->all();
    }
}
