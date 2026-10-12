<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\ProcurementRequest;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Support\Enums\ProcurementRequestStatus;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ProcurementRequestService
{
    public function __construct(private ProcurementService $procurementService)
    {}

    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = ProcurementRequest::with(['product', 'generatedBy']);
        
        $this->applyFilters($query, $filters);
        
        return $query->latest()->paginate($perPage);
    }

    public function create(array $data): ProcurementRequest
    {
        $data['generated_by'] = $data['generated_by'] ?? auth()->id();
        $data['generated_at'] = now();
        $data['status'] = ProcurementRequestStatus::GENERATED;
        
        return ProcurementRequest::create($data);
    }

    public function update(ProcurementRequest $pr, array $data): ProcurementRequest
    {
        $pr->update($data);
        return $pr->refresh();
    }

    public function delete(ProcurementRequest $pr): bool
    {
        return $pr->delete();
    }

    public function generateAutomaticRequests(): Collection
    {
        return $this->procurementService->generateReorderRequests(auth()->user());
    }

    public function review(ProcurementRequest $pr, string $action, int $reviewerId, ?int $suggestedQuantity = null, ?string $notes = null): ProcurementRequest
    {
        $reviewer = \App\Models\User::findOrFail($reviewerId);
        
        $pr->reviewed_by = $reviewerId;
        $pr->reviewed_at = now();
        $pr->review_notes = $notes;
        
        if ($action === 'approve') {
            $pr->status = ProcurementRequestStatus::APPROVED;
        } elseif ($action === 'modify' && $suggestedQuantity) {
            $pr->suggested_quantity = $suggestedQuantity;
            $pr->status = ProcurementRequestStatus::REVIEWED;
        } elseif ($action === 'dismiss') {
            $pr->status = ProcurementRequestStatus::DISMISSED;
        }
        
        $pr->save();
        
        return $pr;
    }

    public function convertToPurchaseOrder(ProcurementRequest $pr, int $supplierId, float $unitCost, string $expectedDeliveryDate): PurchaseOrder
    {
        return $this->procurementService->convertRequestToPurchaseOrder($pr, [
            'supplier_id' => $supplierId,
            'expected_delivery_date' => $expectedDeliveryDate,
        ]);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('product', fn($q) => $q->where('name', 'like', "%{$search}%")
                                                    ->orWhere('sku', 'like', "%{$search}%"));
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }
    }
}
