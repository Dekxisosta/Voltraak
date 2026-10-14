<?php

namespace App\Modules\Procurement\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Services\PurchaseOrderService;
use App\Modules\Procurement\Requests\StorePurchaseOrderRequest;
use App\Modules\Procurement\Requests\UpdatePurchaseOrderRequest;
use App\Modules\Procurement\Resources\PurchaseOrderResource;
use Illuminate\Http\Request;

class PurchaseOrderController extends BaseController
{
    /** Statuses warehouse staff may list/open (those that can be received against). */
    private const RECEIVABLE_STATUSES = ['approved', 'sent', 'received'];

    public function __construct(
        private PurchaseOrderService $poService
    ) {}

    /**
     * True when the caller's only procurement access is the receiving workflow
     * (warehouse role); inventory staff, managers and admins keep full read access.
     */
    private function isWarehouseOnly(Request $request): bool
    {
        return $request->user()?->role === \App\Support\Enums\UserRole::WAREHOUSE;
    }

    public function index(Request $request)
    {
        $this->authorize('purchase_order.read');

        $status = $request->status;

        // Warehouse staff only need purchase orders they can receive against.
        if ($this->isWarehouseOnly($request)) {
            $requested = array_filter(array_map('trim', explode(',', (string) $status)));
            $allowed = array_values(array_intersect(
                $requested ?: self::RECEIVABLE_STATUSES,
                self::RECEIVABLE_STATUSES
            ));
            $status = $allowed ?: self::RECEIVABLE_STATUSES;
        }

        $orders = $this->poService->paginate(
            filters: [
                'search' => $request->search,
                'status' => $status,
                'supplier_id' => $request->supplier_id,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
            ],
            perPage: $request->per_page ?? 15
        );

        return $this->successResponse(
            PurchaseOrderResource::collection($orders),
            'Purchase orders retrieved successfully'
        );
    }

    public function store(StorePurchaseOrderRequest $request)
    {
        $this->authorize('purchase_order.create');

        $po = $this->poService->create($request->validated());

        $this->logActivity('purchase_order.created', null, ['po_id' => $po->id, 'po_number' => $po->po_number]);

        return $this->successResponse(
            new PurchaseOrderResource($po->load(['supplier', 'items.product'])),
            'Purchase order created successfully',
            201
        );
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.read');

        if ($this->isWarehouseOnly(request())
            && !in_array($purchaseOrder->status->value, self::RECEIVABLE_STATUSES, true)) {
            return $this->errorResponse('This purchase order is not available for receiving', 403);
        }

        $purchaseOrder->load(['supplier', 'items.product', 'creator']);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder),
            'Purchase order retrieved successfully'
        );
    }

    public function update(UpdatePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.update');

        if (!in_array($purchaseOrder->status->value, ['draft', 'pending'])) {
            return $this->errorResponse('Cannot update purchase order in current status', 409);
        }

        $oldData = $purchaseOrder->toArray();
        $purchaseOrder = $this->poService->update($purchaseOrder, $request->validated());

        $this->logActivity('purchase_order.updated', null, [
            'po_id' => $purchaseOrder->id,
            'old' => $oldData,
            'new' => $purchaseOrder->toArray()
        ]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->load(['supplier', 'items.product'])),
            'Purchase order updated successfully'
        );
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.delete');

        if (!in_array($purchaseOrder->status->value, ['draft', 'cancelled'])) {
            return $this->errorResponse('Can only delete draft or cancelled purchase orders', 409);
        }

        $this->poService->delete($purchaseOrder);

        $this->logActivity('purchase_order.deleted', null, ['po_id' => $purchaseOrder->id, 'po_number' => $purchaseOrder->po_number]);

        return $this->successResponse(null, 'Purchase order deleted successfully');
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.approve');

        if ($purchaseOrder->status->value !== 'pending') {
            return $this->errorResponse('Can only approve pending purchase orders', 409);
        }

        try {
            $this->poService->approve($purchaseOrder, auth()->id());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 409);
        }

        $this->logActivity('purchase_order.approved', null, ['po_id' => $purchaseOrder->id, 'po_number' => $purchaseOrder->po_number]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product'])),
            'Purchase order approved successfully'
        );
    }

    public function reject(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.approve');

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        if ($purchaseOrder->status->value !== 'pending') {
            return $this->errorResponse('Can only reject pending purchase orders', 409);
        }

        try {
            $this->poService->reject($purchaseOrder, auth()->id(), $validated['reason'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 409);
        }

        $this->logActivity('purchase_order.rejected', null, [
            'po_id' => $purchaseOrder->id,
            'po_number' => $purchaseOrder->po_number,
            'reason' => $validated['reason'] ?? null,
        ]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product', 'creator'])),
            'Purchase order rejected successfully'
        );
    }

    public function send(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.update');

        if ($purchaseOrder->status->value !== 'approved') {
            return $this->errorResponse('Can only send approved purchase orders to suppliers', 409);
        }

        $this->poService->send($purchaseOrder);

        $this->logActivity('purchase_order.sent', null, [
            'po_id' => $purchaseOrder->id,
            'po_number' => $purchaseOrder->po_number
        ]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product'])),
            'Purchase order sent to supplier successfully'
        );
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.receive');

        $request->validate([
            'items' => 'required|array',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.quantity_received' => 'required|integer|min:0',
            'items.*.batches' => 'required|array|min:1',
            'items.*.batches.*.batch_number' => 'required|string|max:100',
            'items.*.batches.*.quantity' => 'required|integer|min:1',
            'items.*.batches.*.manufacture_date' => 'nullable|date',
            'items.*.batches.*.expiry_date' => 'nullable|date|after_or_equal:items.*.batches.*.manufacture_date',
            'notes' => 'nullable|string|max:1000'
        ]);

        try {
            $purchaseOrder = $this->poService->receive($purchaseOrder, $request->all(), auth()->id());

            $this->logActivity('purchase_order.received', null, [
                'po_id' => $purchaseOrder->id,
            ]);

            return $this->successResponse(
                new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product'])),
                'Purchase order received successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    public function cancel(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.cancel');

        if (in_array($purchaseOrder->status->value, ['received', 'completed', 'cancelled'])) {
            return $this->errorResponse('Cannot cancel purchase order in current status', 409);
        }

        $request->validate(['reason' => 'required|string|max:500']);

        $this->poService->cancel($purchaseOrder, $request->reason);

        $this->logActivity('purchase_order.cancelled', null, [
            'po_id' => $purchaseOrder->id,
            'reason' => $request->reason
        ]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->refresh()),
            'Purchase order cancelled successfully'
        );
    }
}
