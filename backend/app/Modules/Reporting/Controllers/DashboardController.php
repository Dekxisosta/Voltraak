<?php

namespace App\Modules\Reporting\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Reporting\Services\DashboardService;
use App\Modules\Reporting\Services\AnalyticsService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends BaseController
{
    public function __construct(
        private DashboardService $dashboardService,
        private AnalyticsService $analyticsService
    ) {}

    /**
     * Get executive dashboard data.
     */
    public function executive()
    {
        $this->authorize('dashboard.executive');

        try {
            $dashboard = $this->dashboardService->getExecutiveDashboard();

            return $this->successResponse(
                $dashboard,
                'Executive dashboard data retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to load executive dashboard: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get manager dashboard data.
     */
    public function manager()
    {
        $this->authorize('dashboard.manager');

        try {
            $dashboard = $this->dashboardService->getManagerDashboard();

            return $this->successResponse(
                $dashboard,
                'Manager dashboard data retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to load manager dashboard: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get staff dashboard data (inventory and warehouse staff).
     */
    public function staff()
    {
        $this->authorize('dashboard.staff');

        try {
            $dashboard = $this->dashboardService->getStaffDashboard();

            return $this->successResponse(
                $dashboard,
                'Staff dashboard data retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to load staff dashboard: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get comprehensive KPIs.
     */
    public function kpis(Request $request)
    {
        $this->authorize('dashboard.kpis');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'type' => 'nullable|in:inventory,procurement,all'
        ]);

        try {
            $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::now()->subDays(30);
            $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::now();
            $type = $request->type ?? 'all';

            $kpis = [];

            if ($type === 'inventory' || $type === 'all') {
                $kpis['inventory'] = $this->analyticsService->getInventoryKPIs($startDate, $endDate);
            }

            if ($type === 'procurement' || $type === 'all') {
                $kpis['procurement'] = $this->analyticsService->getProcurementKPIs($startDate, $endDate);
            }

            return $this->successResponse(
                $kpis,
                'KPIs retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to calculate KPIs: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get inventory trends.
     */
    public function inventoryTrends(Request $request)
    {
        $this->authorize('dashboard.trends');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'interval' => 'nullable|in:hourly,daily,weekly,monthly'
        ]);

        try {
            $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::now()->subDays(30);
            $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::now();
            $interval = $request->interval ?? 'daily';

            $trends = $this->analyticsService->getInventoryTrends($startDate, $endDate, $interval);

            return $this->successResponse(
                $trends,
                'Inventory trends retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to retrieve inventory trends: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get ABC analysis.
     */
    public function abcAnalysis()
    {
        $this->authorize('dashboard.analytics');

        try {
            $analysis = $this->analyticsService->getABCAnalysis();

            return $this->successResponse(
                $analysis,
                'ABC analysis retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to perform ABC analysis: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get real-time alerts.
     */
    public function alerts(Request $request)
    {
        $this->authorize('dashboard.alerts');

        $request->validate([
            'severity' => 'nullable|in:critical,warning,info',
            'type' => 'nullable|in:stockout,low_stock,expiring_batches,expired_batches,overdue_orders,pending_requests',
            'limit' => 'nullable|integer|min:1|max:100'
        ]);

        try {
            // Get all alerts
            $allAlerts = collect($this->dashboardService->getExecutiveDashboard()['alerts']);

            // Apply filters
            if ($request->severity) {
                $allAlerts = $allAlerts->where('severity', $request->severity);
            }

            if ($request->type) {
                $allAlerts = $allAlerts->where('type', $request->type);
            }

            // Apply limit
            $limit = $request->limit ?? 20;
            $alerts = $allAlerts->take($limit)->values();

            return $this->successResponse(
                [
                    'alerts' => $alerts,
                    'total_count' => $allAlerts->count(),
                    'critical_count' => $allAlerts->where('severity', 'critical')->count(),
                    'warning_count' => $allAlerts->where('severity', 'warning')->count()
                ],
                'Alerts retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to retrieve alerts: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get inventory accuracy metrics.
     */
    public function accuracy(Request $request)
    {
        $this->authorize('dashboard.accuracy');

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'product_id' => 'nullable|exists:products,id'
        ]);

        try {
            $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::now()->subDays(30);
            $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::now();

            $accuracy = $this->analyticsService->calculateInventoryAccuracy($startDate, $endDate);

            // If specific product requested, get detailed accuracy for that product
            if ($request->product_id) {
                $productAccuracy = $this->getProductAccuracy($request->product_id, $startDate, $endDate);
                $accuracy['product_details'] = $productAccuracy;
            }

            return $this->successResponse(
                $accuracy,
                'Accuracy metrics retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to calculate accuracy metrics: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get product-specific accuracy.
     */
    private function getProductAccuracy(int $productId, Carbon $startDate, Carbon $endDate): array
    {
        $physicalCounts = \App\Modules\Inventory\Models\PhysicalCount::where('product_id', $productId)
            ->whereBetween('count_date', [$startDate, $endDate])
            ->with('product:id,name,sku')
            ->orderBy('count_date', 'desc')
            ->get();

        if ($physicalCounts->isEmpty()) {
            return [
                'product_id' => $productId,
                'accuracy_percentage' => null,
                'total_counts' => 0,
                'accurate_counts' => 0,
                'counts' => []
            ];
        }

        $accurateCount = $physicalCounts->filter(function ($count) {
            return abs($count->variance_percentage) <= 5;
        })->count();

        return [
            'product_id' => $productId,
            'product_name' => $physicalCounts->first()->product->name ?? 'Unknown',
            'product_sku' => $physicalCounts->first()->product->sku ?? '',
            'accuracy_percentage' => round(($accurateCount / $physicalCounts->count()) * 100, 2),
            'total_counts' => $physicalCounts->count(),
            'accurate_counts' => $accurateCount,
            'average_variance' => $physicalCounts->avg('variance'),
            'average_variance_percentage' => $physicalCounts->avg('variance_percentage'),
            'recent_counts' => $physicalCounts->take(10)->map(function ($count) {
                return [
                    'id' => $count->id,
                    'count_date' => $count->count_date,
                    'expected_quantity' => $count->expected_quantity,
                    'actual_quantity' => $count->actual_quantity,
                    'variance' => $count->variance,
                    'variance_percentage' => $count->variance_percentage,
                    'is_accurate' => abs($count->variance_percentage) <= 5
                ];
            })->toArray()
        ];
    }

    /**
     * Get performance summary.
     */
    public function performance(Request $request)
    {
        $this->authorize('dashboard.performance');

        $request->validate([
            'period' => 'nullable|in:daily,weekly,monthly,quarterly',
            'metrics' => 'nullable|array',
            'metrics.*' => 'in:accuracy,turnover,shrinkage,service_level,fefo_compliance'
        ]);

        try {
            $period = $request->period ?? 'monthly';
            $requestedMetrics = $request->metrics ?? ['accuracy', 'turnover', 'shrinkage', 'service_level'];

            // Calculate date range based on period
            [$startDate, $endDate] = $this->getDateRangeForPeriod($period);

            $kpis = $this->analyticsService->getInventoryKPIs($startDate, $endDate);

            // Filter to requested metrics
            $performance = collect($kpis)->only($requestedMetrics);

            // Add trend information
            $trends = $this->calculatePerformanceTrends($requestedMetrics, $period);

            return $this->successResponse(
                [
                    'period' => $period,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'metrics' => $performance,
                    'trends' => $trends
                ],
                'Performance metrics retrieved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to retrieve performance metrics: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * Get date range for period.
     */
    private function getDateRangeForPeriod(string $period): array
    {
        $endDate = Carbon::now();
        
        $startDate = match($period) {
            'daily' => $endDate->copy()->subDay(),
            'weekly' => $endDate->copy()->subWeek(),
            'monthly' => $endDate->copy()->subMonth(),
            'quarterly' => $endDate->copy()->subMonths(3),
            default => $endDate->copy()->subMonth()
        };

        return [$startDate, $endDate];
    }

    /**
     * Calculate performance trends.
     */
    private function calculatePerformanceTrends(array $metrics, string $period): array
    {
        // Get current period metrics
        [$currentStart, $currentEnd] = $this->getDateRangeForPeriod($period);
        $currentKPIs = $this->analyticsService->getInventoryKPIs($currentStart, $currentEnd);

        // Get previous period metrics for comparison
        $periodLength = $currentStart->diffInDays($currentEnd);
        $previousStart = $currentStart->copy()->subDays($periodLength);
        $previousEnd = $currentStart->copy();
        $previousKPIs = $this->analyticsService->getInventoryKPIs($previousStart, $previousEnd);

        $trends = [];

        foreach ($metrics as $metric) {
            $currentValue = $this->getMetricValue($currentKPIs, $metric);
            $previousValue = $this->getMetricValue($previousKPIs, $metric);

            if ($previousValue > 0) {
                $change = (($currentValue - $previousValue) / $previousValue) * 100;
            } else {
                $change = $currentValue > 0 ? 100 : 0;
            }

            $trends[$metric] = [
                'current_value' => $currentValue,
                'previous_value' => $previousValue,
                'change_percentage' => round($change, 2),
                'trend' => match(true) {
                    $change > 2 => 'improving',
                    $change < -2 => 'declining',
                    default => 'stable'
                }
            ];
        }

        return $trends;
    }

    /**
     * Get metric value from KPIs.
     */
    private function getMetricValue(array $kpis, string $metric): float
    {
        return match($metric) {
            'accuracy' => $kpis['accuracy']['percentage'] ?? 0,
            'turnover' => $kpis['turnover']['turnover_rate'] ?? 0,
            'shrinkage' => $kpis['shrinkage']['rate_percentage'] ?? 0,
            'service_level' => $kpis['service_level']['service_level_percentage'] ?? 0,
            'fefo_compliance' => $kpis['fefo_compliance']['compliance_rate'] ?? 0,
            default => 0
        };
    }

    /**
     * Export dashboard data.
     */
    public function export(Request $request)
    {
        $this->authorize('dashboard.export');

        $request->validate([
            'type' => 'required|in:executive,manager,staff',
            'format' => 'nullable|in:json,csv,excel',
            'include' => 'nullable|array',
            'include.*' => 'in:kpis,trends,alerts,performance'
        ]);

        try {
            $dashboardData = match($request->type) {
                'executive' => $this->dashboardService->getExecutiveDashboard(),
                'manager' => $this->dashboardService->getManagerDashboard(),
                'staff' => $this->dashboardService->getStaffDashboard()
            };

            // Filter data based on include parameter
            if ($request->include) {
                $dashboardData = collect($dashboardData)->only($request->include)->toArray();
            }

            // Add metadata
            $exportData = [
                'exported_at' => Carbon::now()->toISOString(),
                'dashboard_type' => $request->type,
                'generated_by' => auth()->user()->name,
                'data' => $dashboardData
            ];

            $format = $request->format ?? 'json';

            return $this->successResponse(
                $exportData,
                "Dashboard data exported successfully in {$format} format"
            );
        } catch (\Exception $e) {
            return $this->errorResponse(
                'Failed to export dashboard data: ' . $e->getMessage(),
                500
            );
        }
    }
}