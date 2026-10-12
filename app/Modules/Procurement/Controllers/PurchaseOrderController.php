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
    public function __construct(
        private PurchaseOrderService $poService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('purchase_order.read');

        $orders = $this->poService->paginate(
            filters: [
                'search' => $request->search,
                'status' => $request->status,
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

        $this->poService->approve($purchaseOrder, auth()->id());

        $this->logActivity('purchase_order.approved', null, ['po_id' => $purchaseOrder->id, 'po_number' => $purchaseOrder->po_number]);

        return $this->successResponse(
            new PurchaseOrderResource($purchaseOrder->refresh()->load(['supplier', 'items.product'])),
            'Purchase order approved successfully'
        );
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('purchase_order.receive');

        $request->validate([
            'items' => 'required|array',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.received_quantity' => 'required|integer|min:0',
            'received_date' => 'required|date',
            'notes' => 'nullable|string|max:1000'
        ]);

        try {
            $receivingReport = $this->poService->receive($purchaseOrder, $request->all(), auth()->id());

            $this->logActivity('purchase_order.received', null, [
                'po_id' => $purchaseOrder->id,
                'report_id' => $receivingReport->id
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
