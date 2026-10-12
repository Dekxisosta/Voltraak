<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\ReceivingReport;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PurchaseOrderService
{
    public function __construct(private ProcurementService $procurementService)
    {}

    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PurchaseOrder::with(['supplier', 'creator']);
        
        $this->applyFilters($query, $filters);
        
        return $query->latest()->paginate($perPage);
    }

    public function create(array $data): PurchaseOrder
    {
        return $this->procurementService->createPurchaseOrder($data, $data['items'] ?? []);
    }

    public function update(PurchaseOrder $po, array $data): PurchaseOrder
    {
        DB::transaction(function () use ($po, $data) {
            if (isset($data['items'])) {
                $po->items()->delete();
                $this->procurementService->addItemsToPurchaseOrder($po, $data['items']);
                unset($data['items']);
            }
            
            $po->update($data);
            $po->calculateTotals();
            $po->save();
        });
        
        return $po->refresh();
    }

    public function delete(PurchaseOrder $po): bool
    {
        return $po->delete();
    }

    public function approve(PurchaseOrder $po, int $approverId): void
    {
        $approver = \App\Models\User::findOrFail($approverId);
        $this->procurementService->approvePurchaseOrder($po, $approver);
    }

    public function receive(PurchaseOrder $po, array $data, int $receiverId): ReceivingReport
    {
        return DB::transaction(function () use ($po, $data, $receiverId) {
            $report = ReceivingReport::create([
                'purchase_order_id' => $po->id,
                'received_by' => $receiverId,
                'received_date' => $data['received_date'],
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $itemData) {
                $poItem = $po->items()->findOrFail($itemData['purchase_order_item_id']);
                $poItem->update(['received_quantity' => $itemData['received_quantity']]);
            }

            $allReceived = $po->items()->whereColumn('received_quantity', '>=', 'quantity')->count() === $po->items()->count();
            
            if ($allReceived) {
                $po->update([
                    'status' => \App\Support\Enums\PurchaseOrderStatus::COMPLETED,
                    'actual_delivery_date' => $data['received_date']
                ]);
            } else {
                $po->update(['status' => \App\Support\Enums\PurchaseOrderStatus::RECEIVED]);
            }

            return $report;
        });
    }

    public function cancel(PurchaseOrder $po, string $reason): void
    {
        $po->update([
            'status' => \App\Support\Enums\PurchaseOrderStatus::CANCELLED,
            'notes' => ($po->notes ? $po->notes . "\n\n" : '') . "Cancelled: {$reason}"
        ]);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', fn($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('order_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('order_date', '<=', $filters['date_to']);
        }
    }
}
