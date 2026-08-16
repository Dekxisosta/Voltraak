<?php

namespace App\Modules\Inventory\Repositories;

use App\Modules\Inventory\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ProductRepository
{
    public function __construct(
        private Product $model
    ) {}

    /**
     * Get paginated products with filters.
     */
    public function paginate(array $filters = [], int $perPage = 15, array $with = []): LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        if (!empty($with)) {
            $query->with($with);
        }

        // Apply filters
        $this->applyFilters($query, $filters);

        return $query->latest()->paginate($perPage);
    }

    /**
     * Create a new product.
     */
    public function create(array $data): Product
    {
        return $this->model->create($data);
    }

    /**
     * Update a product.
     */
    public function update(Product $product, array $data): Product
    {
        $product->update($data);
        return $product->refresh();
    }

    /**
     * Delete a product.
     */
    public function delete(Product $product): bool
    {
        return $product->delete();
    }

    /**
     * Find product by ID with relations.
     */
    public function findWithRelations(int $id, array $with = []): ?Product
    {
        $query = $this->model->newQuery();

        if (!empty($with)) {
            $query->with($with);
        }

        return $query->find($id);
    }

    /**
     * Get products with low stock.
     */
    public function getLowStockProducts(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->lowStock()
            ->with(['batches' => function($query) {
                $query->available()->orderBy('expiry_date');
            }])
            ->paginate($perPage);
    }

    /**
     * Get products that are out of stock.
     */
    public function getOutOfStockProducts(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->outOfStock()
            ->with(['batches' => function($query) {
                $query->available()->orderBy('expiry_date');
            }])
            ->paginate($perPage);
    }

    /**
     * Get products by category.
     */
    public function getByCategory(string $category, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where('category', $category)
            ->with(['batches' => function($query) {
                $query->available()->orderBy('expiry_date');
            }])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Search products by name, SKU, or description.
     */
    public function search(string $search, int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->where(function($query) use ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        })
        ->with(['batches' => function($query) {
            $query->available()->orderBy('expiry_date');
        }])
        ->latest()
        ->paginate($perPage);
    }

    /**
     * Get products requiring reorder.
     */
    public function getRequiringReorder(): Collection
    {
        return $this->model->whereRaw('current_quantity <= reorder_point')
            ->where('reorder_point', '>', 0)
            ->with(['batches' => function($query) {
                $query->available()->orderBy('expiry_date');
            }])
            ->get();
    }

    /**
     * Get products with expiring batches.
     */
    public function getWithExpiringBatches(int $days = 60): Collection
    {
        return $this->model->whereHas('batches', function($query) use ($days) {
            $query->where('expiry_date', '<=', now()->addDays($days))
                  ->where('current_quantity', '>', 0);
        })
        ->with(['batches' => function($query) use ($days) {
            $query->where('expiry_date', '<=', now()->addDays($days))
                  ->where('current_quantity', '>', 0)
                  ->orderBy('expiry_date');
        }])
        ->get();
    }

    /**
     * Get product statistics.
     */
    public function getStatistics(): array
    {
        return [
            'total_products' => $this->model->count(),
            'active_products' => $this->model->where('is_active', true)->count(),
            'low_stock_products' => $this->model->lowStock()->count(),
            'out_of_stock_products' => $this->model->outOfStock()->count(),
            'total_value' => $this->model->sum('unit_cost'),
            'categories' => $this->model->distinct('category')->pluck('category')->filter()->values()
        ];
    }

    /**
     * Get products by SKU.
     */
    public function findBySku(string $sku): ?Product
    {
        return $this->model->where('sku', $sku)->first();
    }

    /**
     * Get products with batches summary.
     */
    public function getWithBatchesSummary(): Collection
    {
        return $this->model->with([
            'batches' => function($query) {
                $query->selectRaw('
                    product_id,
                    SUM(current_quantity) as total_quantity,
                    COUNT(*) as batch_count,
                    MIN(expiry_date) as earliest_expiry,
                    MAX(expiry_date) as latest_expiry
                ')
                ->groupBy('product_id');
            }
        ])->get();
    }

    /**
     * Apply filters to query.
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['status'])) {
            $query->where('is_active', $filters['status']);
        }

        if (!empty($filters['low_stock'])) {
            $query->whereRaw('current_quantity <= reorder_point');
        }

        if (!empty($filters['out_of_stock'])) {
            $query->where('current_quantity', 0);
        }
    }

    /**
     * Bulk update products.
     */
    public function bulkUpdate(array $productIds, array $data): int
    {
        return $this->model->whereIn('id', $productIds)->update($data);
    }

    /**
     * Get products for export.
     */
    public function getForExport(array $filters = []): Collection
    {
        $query = $this->model->newQuery()
            ->with(['batches' => function($q) {
                $q->available()->orderBy('expiry_date');
            }]);

        $this->applyFilters($query, $filters);

        return $query->get();
    }
}