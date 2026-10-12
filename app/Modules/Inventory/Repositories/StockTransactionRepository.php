<?php

namespace App\Modules\Inventory\Repositories;

use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class StockTransactionRepository
{
    public function __construct(
        private StockTransaction $model
    ) {}

    /**
     * Get paginated stock transactions with filters.
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
     * Create a new stock transaction.
     */
    public function create(array $data): StockTransaction
    {
        return $this->model->create($data);
    }

    /**
     * Get stock transactions for a product.
     */
    public function getProductHistory(int $productId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('product_id', $productId)
            ->with(['batch', 'user'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Get stock transactions for a batch.
     */
    public function getBatchHistory(int $batchId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('batch_id', $batchId)
            ->with(['product', 'user'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Get transactions by type.
     */
    public function getByType(StockTransactionType $type, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('type', $type)
            ->with(['product', 'batch', 'user'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Get user's transaction history.
     */
    public function getUserHistory(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('user_id', $userId)
            ->with(['product', 'batch'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Get daily stock summary.
     */
    public function getDailySummary(string $date): array
    {
        $transactions = $this->model->whereDate('created_at', $date)
            ->selectRaw('
                type,
                COUNT(*) as transaction_count,
                SUM(quantity) as total_quantity,
                COUNT(DISTINCT product_id) as unique_products
            ')
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $stockIn = $transactions->get(StockTransactionType::IN->value, (object)[
            'transaction_count' => 0,
            'total_quantity' => 0,
            'unique_products' => 0
        ]);

        $stockOut = $transactions->get(StockTransactionType::OUT->value, (object)[
            'transaction_count' => 0,
            'total_quantity' => 0,
            'unique_products' => 0
        ]);

        $adjustment = $transactions->get(StockTransactionType::ADJUSTMENT->value, (object)[
            'transaction_count' => 0,
            'total_quantity' => 0,
            'unique_products' => 0
        ]);

        return [
            'date' => $date,
            'stock_in' => [
                'transactions' => $stockIn->transaction_count,
                'quantity' => $stockIn->total_quantity,
                'products' => $stockIn->unique_products
            ],
            'stock_out' => [
                'transactions' => $stockOut->transaction_count,
                'quantity' => $stockOut->total_quantity,
                'products' => $stockOut->unique_products
            ],
            'adjustments' => [
                'transactions' => $adjustment->transaction_count,
                'quantity' => $adjustment->total_quantity,
                'products' => $adjustment->unique_products
            ],
            'net_movement' => $stockIn->total_quantity - $stockOut->total_quantity + $adjustment->total_quantity,
            'total_transactions' => $stockIn->transaction_count + $stockOut->transaction_count + $adjustment->transaction_count
        ];
    }

    /**
     * Get transaction statistics for a period.
     */
    public function getStatistics(int $days = 30): array
    {
        $startDate = now()->subDays($days)->startOfDay();
        $endDate = now()->endOfDay();

        $transactions = $this->model->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('
                type,
                COUNT(*) as transaction_count,
                SUM(quantity) as total_quantity,
                COUNT(DISTINCT product_id) as unique_products,
                COUNT(DISTINCT user_id) as unique_users
            ')
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $dailyActivity = $this->model->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as transactions')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topProducts = $this->model->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('product_id, SUM(quantity) as total_quantity, COUNT(*) as transaction_count')
            ->with('product:id,name,sku')
            ->groupBy('product_id')
            ->orderBy('total_quantity', 'desc')
            ->limit(10)
            ->get();

        return [
            'period' => [
                'days' => $days,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d')
            ],
            'summary' => [
                'total_transactions' => $transactions->sum('transaction_count'),
                'total_quantity' => $transactions->sum('total_quantity'),
                'unique_products' => $this->model->whereBetween('created_at', [$startDate, $endDate])
                                         ->distinct('product_id')->count(),
                'unique_users' => $this->model->whereBetween('created_at', [$startDate, $endDate])
                                       ->distinct('user_id')->count()
            ],
            'by_type' => $transactions,
            'daily_activity' => $dailyActivity,
            'top_products' => $topProducts
        ];
    }

    /**
     * Get recent transactions.
     */
    public function getRecent(int $limit = 50): Collection
    {
        return $this->model->with(['product', 'batch', 'user'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * Get transactions for audit trail.
     */
    public function getAuditTrail(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->with(['product', 'batch', 'user']);

        $this->applyFilters($query, $filters);

        return $query->latest()->paginate($perPage);
    }

    /**
     * Get stock movement between dates.
     */
    public function getMovementBetweenDates(string $startDate, string $endDate): Collection
    {
        return $this->model->whereBetween('created_at', [$startDate, $endDate])
            ->with(['product', 'batch', 'user'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Get transactions by reference (order, purchase, etc.).
     */
    public function getByReference(string $referenceType, string $referenceId): Collection
    {
        return $this->model->where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->with(['product', 'batch', 'user'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Calculate stock velocity for a product.
     */
    public function calculateStockVelocity(int $productId, int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $outTransactions = $this->model->where('product_id', $productId)
            ->where('type', StockTransactionType::OUT)
            ->where('created_at', '>=', $startDate)
            ->sum('quantity');

        $velocity = $days > 0 ? $outTransactions / $days : 0;

        return [
            'product_id' => $productId,
            'period_days' => $days,
            'total_out' => $outTransactions,
            'daily_average' => $velocity,
            'monthly_projection' => $velocity * 30
        ];
    }

    /**
     * Get stock adjustments.
     */
    public function getAdjustments(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('type', StockTransactionType::ADJUSTMENT)
            ->with(['product', 'batch', 'user'])
            ->latest()
            ->paginate($perPage);
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

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                  ->orWhere('reference_type', 'like', "%{$search}%")
                  ->orWhere('reference_id', 'like', "%{$search}%")
                  ->orWhereHas('product', function($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                  });
            });
        }
    }

    /**
     * Get transaction count by user.
     */
    public function getCountByUser(int $days = 30): Collection
    {
        return $this->model->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('user_id, COUNT(*) as transaction_count, SUM(quantity) as total_quantity')
            ->with('user:id,name,email')
            ->groupBy('user_id')
            ->orderBy('transaction_count', 'desc')
            ->get();
    }

    /**
     * Bulk create transactions.
     */
    public function bulkCreate(array $transactions): Collection
    {
        $this->model->insert($transactions);
        
        // Return the created transactions (note: this won't include auto-generated IDs)
        return collect($transactions)->map(function($transaction) {
            return $this->model->create($transaction);
        });
    }
}