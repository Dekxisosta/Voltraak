<?php

namespace App\Modules\Inventory\Repositories;

use App\Modules\Inventory\Models\Batch;
use App\Support\Enums\BatchStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class BatchRepository
{
    public function __construct(
        private Batch $model
    ) {}

    /**
     * Get paginated batches with filters.
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
     * Create a new batch.
     */
    public function create(array $data): Batch
    {
        return $this->model->create($data);
    }

    /**
     * Update a batch.
     */
    public function update(Batch $batch, array $data): Batch
    {
        $batch->update($data);
        return $batch->refresh();
    }

    /**
     * Delete a batch.
     */
    public function delete(Batch $batch): bool
    {
        return $batch->delete();
    }

    /**
     * Get batches for FEFO picking.
     */
    public function getForFEFO(int $productId, int $quantity): Collection
    {
        return $this->model->where('product_id', $productId)
            ->available()
            ->orderBy('expiry_date')
            ->orderBy('created_at')
            ->get()
            ->takeWhile(function ($batch, $key) use (&$quantity) {
                if ($quantity <= 0) return false;
                $quantity -= $batch->available_quantity;
                return true;
            });
    }

    /**
     * Get batches expiring soon.
     */
    public function getExpiringSoon(int $days = 60, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->expiringSoon($days)
            ->with(['product'])
            ->orderBy('expiry_date')
            ->paginate($perPage);
    }

    /**
     * Get expired batches.
     */
    public function getExpired(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->expired()
            ->with(['product'])
            ->orderBy('expiry_date')
            ->paginate($perPage);
    }

    /**
     * Get available batches for a product.
     */
    public function getAvailableForProduct(int $productId): Collection
    {
        return $this->model->where('product_id', $productId)
            ->available()
            ->orderBy('expiry_date')
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Get batch by code.
     */
    public function findByCode(string $batchCode): ?Batch
    {
        return $this->model->where('batch_code', $batchCode)->first();
    }

    /**
     * Get batches by status.
     */
    public function getByStatus(BatchStatus $status, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('status', $status)
            ->with(['product'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Get batch history with stock transactions.
     */
    public function getHistory(Batch $batch): Collection
    {
        return $batch->stockTransactions()
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get batches requiring attention.
     */
    public function getRequiringAttention(): Collection
    {
        return $this->model->where(function($query) {
            $query->where('status', BatchStatus::WARNING)
                  ->orWhere('status', BatchStatus::EXPIRED)
                  ->orWhere('current_quantity', '<', 0); // Should not happen but safety check
        })
        ->with(['product'])
        ->orderBy('expiry_date')
        ->get();
    }

    /**
     * Get batch statistics.
     */
    public function getStatistics(): array
    {
        $totalBatches = $this->model->count();
        $availableBatches = $this->model->available()->count();
        $expiredBatches = $this->model->expired()->count();
        $expiringSoonBatches = $this->model->expiringSoon(60)->count();
        $totalQuantity = $this->model->sum('current_quantity');
        $totalValue = $this->model->selectRaw('SUM(current_quantity * unit_cost)')->value('sum');

        return [
            'total_batches' => $totalBatches,
            'available_batches' => $availableBatches,
            'expired_batches' => $expiredBatches,
            'expiring_soon_batches' => $expiringSoonBatches,
            'total_quantity' => $totalQuantity,
            'total_value' => $totalValue ?? 0,
            'utilization_rate' => $totalBatches > 0 ? ($availableBatches / $totalBatches) * 100 : 0
        ];
    }

    /**
     * Get batches with low quantity.
     */
    public function getLowQuantity(int $threshold = 10): Collection
    {
        return $this->model->where('current_quantity', '<=', $threshold)
            ->where('current_quantity', '>', 0)
            ->with(['product'])
            ->orderBy('current_quantity')
            ->get();
    }

    /**
     * Get batches by product and date range.
     */
    public function getByProductAndDateRange(int $productId, string $startDate, string $endDate): Collection
    {
        return $this->model->where('product_id', $productId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['stockTransactions'])
            ->orderBy('expiry_date')
            ->get();
    }

    /**
     * Update batch quantities.
     */
    public function updateQuantity(Batch $batch, int $quantity, string $reason = null): Batch
    {
        $batch->update([
            'current_quantity' => $quantity,
            'updated_at' => now()
        ]);

        // Update status based on new quantity and expiry
        $batch->updateStatus();

        return $batch->refresh();
    }

    /**
     * Reserve batch quantity.
     */
    public function reserve(Batch $batch, int $quantity, string $reservedFor, string $reservedUntil = null): Batch
    {
        $batch->update([
            'reserved_quantity' => $batch->reserved_quantity + $quantity,
            'reserved_for' => $reservedFor,
            'reserved_until' => $reservedUntil ? \Carbon\Carbon::parse($reservedUntil) : null
        ]);

        return $batch->refresh();
    }

    /**
     * Release batch reservation.
     */
    public function releaseReservation(Batch $batch, int $quantity = null): Batch
    {
        $releaseQuantity = $quantity ?? $batch->reserved_quantity;

        $batch->update([
            'reserved_quantity' => max(0, $batch->reserved_quantity - $releaseQuantity),
            'reserved_for' => $batch->reserved_quantity <= $releaseQuantity ? null : $batch->reserved_for,
            'reserved_until' => $batch->reserved_quantity <= $releaseQuantity ? null : $batch->reserved_until
        ]);

        return $batch->refresh();
    }

    /**
     * Apply filters to query.
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['expiring_soon'])) {
            $days = is_numeric($filters['expiring_soon']) ? (int)$filters['expiring_soon'] : 60;
            $query->expiringSoon($days);
        }

        if (!empty($filters['expired'])) {
            $query->expired();
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('batch_code', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('product', function($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                  });
            });
        }
    }

    /**
     * Bulk update batch status.
     */
    public function bulkUpdateStatus(array $batchIds, BatchStatus $status): int
    {
        return $this->model->whereIn('id', $batchIds)->update([
            'status' => $status,
            'updated_at' => now()
        ]);
    }

    /**
     * Get batches for disposal (expired with quantity).
     */
    public function getForDisposal(): Collection
    {
        return $this->model->expired()
            ->where('current_quantity', '>', 0)
            ->with(['product'])
            ->orderBy('expiry_date')
            ->get();
    }
}