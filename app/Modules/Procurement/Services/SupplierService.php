<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\Supplier;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class SupplierService
{
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Supplier::query();
        
        $this->applyFilters($query, $filters);
        
        return $query->latest()->paginate($perPage);
    }

    public function create(array $data): Supplier
    {
        return Supplier::create($data);
    }

    public function update(Supplier $supplier, array $data): Supplier
    {
        $supplier->update($data);
        return $supplier->refresh();
    }

    public function delete(Supplier $supplier): bool
    {
        return $supplier->delete();
    }

    public function getPerformanceMetrics(Supplier $supplier): array
    {
        $pos = $supplier->purchaseOrders()
            ->whereIn('status', ['completed', 'received'])
            ->get();

        $onTimeDeliveries = $pos->filter(function ($po) {
            return $po->actual_delivery_date && $po->actual_delivery_date <= $po->expected_delivery_date;
        })->count();

        $totalCompleted = $pos->count();
        $onTimeRate = $totalCompleted > 0 ? ($onTimeDeliveries / $totalCompleted) * 100 : 0;

        return [
            'total_orders' => $supplier->total_orders,
            'completed_orders' => $totalCompleted,
            'on_time_delivery_rate' => round($onTimeRate, 2),
            'average_rating' => $supplier->rating,
            'total_value' => $pos->sum('total_amount'),
        ];
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (isset($filters['status'])) {
            $isActive = $filters['status'] === 'active';
            $query->where('is_active', $isActive);
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }
    }
}
