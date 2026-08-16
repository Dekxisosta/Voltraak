<?php

namespace App\Modules\Inventory\Repositories;

use App\Modules\Inventory\Models\PhysicalCount;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class PhysicalCountRepository
{
    public function __construct(
        private PhysicalCount $model
    ) {}

    /**
     * Get paginated physical counts with filters.
     */
    public function paginate(array $filters = [], int $perPage = 15, array $with = []): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (!empty($with)) {
            $query->with($with);
        }

        $this->applyFilters($query, $filters);

        return $query->latest()->paginate($perPage);
    }

    /**
     * Create a new physical count.
     */
    public function create(array $data): PhysicalCount
    {
        return $this->model->create($data);
    }

    /**
     * Update a physical count.
     */
    public function update(PhysicalCount $physicalCount, array $data): PhysicalCount
    {
        $physicalCount->update($data);
        return $physicalCount->refresh();
    }

    /**
     * Delete a physical count.
     */
    public function delete(PhysicalCount $physicalCount): bool
    {
        return $physicalCount->delete();
    }

    /**
     * Get physical counts with variance above threshold.
     */
    public function getWithVariance(float $thresholdPercentage = 5.0, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->whereRaw('ABS(variance_percentage) >= ?', [$thresholdPercentage])
            ->with(['product', 'batch', 'user'])
            ->orderBy('variance_percentage', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get recent physical counts.
     */
    public function getRecent(int $days = 7, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('count_date', '>=', now()->subDays($days))
            ->with(['product', 'batch', 'user'])
            ->latest('count_date')
            ->paginate($perPage);
    }

    /**
     * Get physical counts for a product.
     */
    public function getForProduct(int $productId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('product_id', $productId)
            ->with(['batch', 'user'])
            ->latest('count_date')
            ->paginate($perPage);
    }

    /**
     * Get physical counts for a batch.
     */
    public function getForBatch(int $batchId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('batch_id', $batchId)
            ->with(['product', 'user'])
            ->latest('count_date')
            ->paginate($perPage);
    }

    /**
     * Get physical count statistics.
     */
    public function getStatistics(int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $counts = $this->model->where('count_date', '>=', $startDate)->get();
        
        $totalCounts = $counts->count();
        $countsWithVariance = $counts->where('variance', '!=', 0)->count();
        $averageVariance = $counts->avg('variance') ?? 0;
        $averageVariancePercentage = $counts->avg('variance_percentage') ?? 0;
        $totalVariance = $counts->sum('variance');
        
        // Accuracy calculation (counts within 5% variance)
        $accurateCounts = $counts->filter(function($count) {
            return abs($count->variance_percentage) <= 5;
        })->count();
        
        $accuracy = $totalCounts > 0 ? ($accurateCounts / $totalCounts) * 100 : 100;
        
        return [
            'period' => [
                'days' => $days,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => now()->format('Y-m-d')
            ],
            'counts' => [
                'total' => $totalCounts,
                'with_variance' => $countsWithVariance,
                'accurate' => $accurateCounts,
                'accuracy_percentage' => round($accuracy, 2)
            ],
            'variance' => [
                'total' => $totalVariance,
                'average' => round($averageVariance, 2),
                'average_percentage' => round($averageVariancePercentage, 2)
            ],
            'products_counted' => $counts->unique('product_id')->count(),
            'users_involved' => $counts->unique('user_id')->count()
        ];
    }

    /**
     * Get accuracy metrics.
     */
    public function getAccuracyMetrics(int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $counts = $this->model->where('count_date', '>=', $startDate)
            ->selectRaw('
                COUNT(*) as total_counts,
                SUM(CASE WHEN ABS(variance_percentage) <= 1 THEN 1 ELSE 0 END) as within_1_percent,
                SUM(CASE WHEN ABS(variance_percentage) <= 2 THEN 1 ELSE 0 END) as within_2_percent,
                SUM(CASE WHEN ABS(variance_percentage) <= 5 THEN 1 ELSE 0 END) as within_5_percent,
                AVG(ABS(variance_percentage)) as average_variance_percentage,
                MAX(ABS(variance_percentage)) as max_variance_percentage,
                SUM(ABS(variance)) as total_absolute_variance
            ')
            ->first();

        if (!$counts || $counts->total_counts == 0) {
            return [
                'period' => [
                    'days' => $days,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => now()->format('Y-m-d')
                ],
                'accuracy_levels' => [
                    'within_1_percent' => 0,
                    'within_2_percent' => 0,
                    'within_5_percent' => 0,
                ],
                'metrics' => [
                    'overall_accuracy' => 0,
                    'average_variance_percentage' => 0,
                    'max_variance_percentage' => 0,
                    'total_counts' => 0
                ]
            ];
        }

        return [
            'period' => [
                'days' => $days,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => now()->format('Y-m-d')
            ],
            'accuracy_levels' => [
                'within_1_percent' => round(($counts->within_1_percent / $counts->total_counts) * 100, 2),
                'within_2_percent' => round(($counts->within_2_percent / $counts->total_counts) * 100, 2),
                'within_5_percent' => round(($counts->within_5_percent / $counts->total_counts) * 100, 2),
            ],
            'metrics' => [
                'overall_accuracy' => round(($counts->within_5_percent / $counts->total_counts) * 100, 2),
                'average_variance_percentage' => round($counts->average_variance_percentage, 2),
                'max_variance_percentage' => round($counts->max_variance_percentage, 2),
                'total_counts' => $counts->total_counts,
                'total_absolute_variance' => $counts->total_absolute_variance
            ]
        ];
    }

    /**
     * Get variance trends over time.
     */
    public function getVarianceTrends(int $days = 30): Collection
    {
        return $this->model->where('count_date', '>=', now()->subDays($days))
            ->selectRaw('
                DATE(count_date) as date,
                COUNT(*) as count_entries,
                AVG(ABS(variance_percentage)) as avg_variance_percentage,
                SUM(ABS(variance)) as total_variance
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }

    /**
     * Get top variance products.
     */
    public function getTopVarianceProducts(int $days = 30, int $limit = 10): Collection
    {
        return $this->model->where('count_date', '>=', now()->subDays($days))
            ->selectRaw('
                product_id,
                COUNT(*) as count_entries,
                AVG(ABS(variance_percentage)) as avg_variance_percentage,
                SUM(ABS(variance)) as total_variance
            ')
            ->with('product:id,name,sku')
            ->groupBy('product_id')
            ->havingRaw('COUNT(*) > 1') // Only products with multiple counts
            ->orderBy('avg_variance_percentage', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get user performance metrics.
     */
    public function getUserPerformance(int $days = 30): Collection
    {
        return $this->model->where('count_date', '>=', now()->subDays($days))
            ->selectRaw('
                user_id,
                COUNT(*) as count_entries,
                AVG(ABS(variance_percentage)) as avg_variance_percentage,
                SUM(CASE WHEN ABS(variance_percentage) <= 5 THEN 1 ELSE 0 END) as accurate_counts
            ')
            ->with('user:id,name,email')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) >= 5') // Only users with at least 5 counts
            ->get()
            ->map(function($item) {
                $item->accuracy_rate = $item->count_entries > 0 
                    ? round(($item->accurate_counts / $item->count_entries) * 100, 2)
                    : 0;
                return $item;
            });
    }

    /**
     * Apply filters to query.
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        if (!empty($filters['batch_id'])) {
            $query->where('batch_id', $filters['batch_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('count_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('count_date', '<=', $filters['date_to']);
        }

        if (!empty($filters['has_variance'])) {
            $query->where('variance', '!=', 0);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                  ->orWhereHas('product', function($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                  })
                  ->orWhereHas('batch', function($bq) use ($search) {
                      $bq->where('batch_code', 'like', "%{$search}%");
                  });
            });
        }
    }

    /**
     * Bulk create physical counts.
     */
    public function bulkCreate(array $counts): Collection
    {
        // Add timestamps and calculate variance for each count
        $countsWithCalculations = collect($counts)->map(function($count) {
            $variance = $count['actual_quantity'] - $count['expected_quantity'];
            $variancePercentage = $count['expected_quantity'] > 0 
                ? ($variance / $count['expected_quantity']) * 100 
                : 0;

            return array_merge($count, [
                'variance' => $variance,
                'variance_percentage' => $variancePercentage,
                'count_date' => $count['count_date'] ?? now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        })->toArray();

        $this->model->insert($countsWithCalculations);
        
        // Return collection of created records
        return collect($countsWithCalculations)->map(function($count) {
            return $this->model->where('product_id', $count['product_id'])
                ->where('count_date', $count['count_date'])
                ->first();
        })->filter();
    }

    /**
     * Get last physical count for a product/batch.
     */
    public function getLastForProduct(int $productId, int $batchId = null): ?PhysicalCount
    {
        $query = $this->model->where('product_id', $productId);
        
        if ($batchId) {
            $query->where('batch_id', $batchId);
        }
        
        return $query->latest('count_date')->first();
    }
}