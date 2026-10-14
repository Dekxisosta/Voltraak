<?php

namespace App\Modules\Procurement\Services;

use App\Modules\Procurement\Models\PurchaseOrder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PurchaseOrderService
{
    public function __construct(private ProcurementService $procurementService)
    {}

    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PurchaseOrder::with(['supplier', 'creator', 'items.product']);
        
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

    public function reject(PurchaseOrder $po, int $reviewerId, ?string $reason = null): void
    {
        $reviewer = \App\Models\User::findOrFail($reviewerId);
        $this->procurementService->rejectPurchaseOrder($po, $reviewer, $reason);
    }

    public function send(PurchaseOrder $po): void
    {
        $this->procurementService->sendPurchaseOrderToSupplier($po);
    }

    public function receive(PurchaseOrder $po, array $data, int $receiverId): PurchaseOrder
    {
        // T18.1: Validate PO status
        $allowedStatuses = [
            \App\Support\Enums\PurchaseOrderStatus::APPROVED,
            \App\Support\Enums\PurchaseOrderStatus::SENT,
            \App\Support\Enums\PurchaseOrderStatus::RECEIVED,
        ];
        if (!in_array($po->status, $allowedStatuses)) {
            throw new \InvalidArgumentException(
                "Cannot receive stock for a PO with status: {$po->status->value}. Allowed: approved, sent, received."
            );
        }

        return DB::transaction(function () use ($po, $data, $receiverId) {
            $receiver = \App\Models\User::findOrFail($receiverId);
            $inventoryService = app(\App\Modules\Inventory\Services\InventoryService::class);

            // Process each received item and create inventory stock
            foreach ($data['items'] as $itemData) {
                $poItem = $po->items()->findOrFail($itemData['purchase_order_item_id']);
                $receivedQty = $itemData['quantity_received'];
                
                // T18.2: Add over-receive guard
                $alreadyReceived = $poItem->received_quantity ?? 0;
                $remaining = $poItem->quantity - $alreadyReceived;
                if ($receivedQty > $remaining) {
                    throw new \InvalidArgumentException(
                        "Cannot over-receive item {$poItem->id}: ordered {$poItem->quantity}, already received {$alreadyReceived}, attempting to receive {$receivedQty}."
                    );
                }
                
                // Update PO item received quantity (cumulative)
                $newReceivedQty = ($poItem->received_quantity ?? 0) + $receivedQty;
                $poItem->update(['received_quantity' => $newReceivedQty]);
                
                // Process each batch for this item
                if (!empty($itemData['batches'])) {
                    foreach ($itemData['batches'] as $batchData) {
                        $batchQty = $batchData['quantity'];
                        
                        if ($batchQty > 0) {
                            $inventoryService->receiveStock([
                                'product_id' => $poItem->product_id,
                                'quantity' => $batchQty,
                                'unit_cost' => $poItem->unit_cost,
                                'reference_type' => 'purchase_order',
                                'reference_id' => $po->id,
                                'reference_number' => $po->po_number,
                                // T18.3: Fix notes handling with null coalescing
                                'notes' => "Received from PO {$po->po_number}" . 
                                           (($data['notes'] ?? null) ? ": {$data['notes']}" : ''),
                                'batch_data' => [
                                    'batch_number' => $batchData['batch_number'],
                                    'quantity' => $batchQty,
                                    'manufacture_date' => $batchData['manufacture_date'] ?? null,
                                    'expiry_date' => $batchData['expiry_date'] ?? null,
                                    'unit_cost' => $poItem->unit_cost,
                                ]
                            ], $receiver);
                        }
                    }
                }
            }

            // T18.4: Fix status-update logic
            $allItemsFullyReceived = $po->items()->get()->every(fn($item) =>
                ($item->received_quantity ?? 0) >= $item->quantity
            );
            
            if ($allItemsFullyReceived) {
                $po->update([
                    'status' => \App\Support\Enums\PurchaseOrderStatus::COMPLETED,
                    'actual_delivery_date' => now()
                ]);
            } else {
                // Partial receipt
                $po->update([
                    'status' => \App\Support\Enums\PurchaseOrderStatus::RECEIVED,
                    'actual_delivery_date' => $po->actual_delivery_date ?? now()
                ]);
            }

            return $po->fresh();
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
            // Accept a single status or a comma-separated list ("sent,approved,received")
            $statuses = is_array($filters['status'])
                ? $filters['status']
                : array_filter(array_map('trim', explode(',', (string) $filters['status'])));

            $query->whereIn('status', $statuses);
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
