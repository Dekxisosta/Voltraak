<?php

namespace App\Modules\Procurement\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Procurement\Models\ProcurementRequest;
use App\Modules\Procurement\Services\ProcurementRequestService;
use App\Modules\Procurement\Requests\StoreProcurementRequestRequest;
use App\Modules\Procurement\Requests\UpdateProcurementRequestRequest;
use App\Modules\Procurement\Resources\ProcurementRequestResource;
use Illuminate\Http\Request;

class ProcurementRequestController extends BaseController
{
    public function __construct(
        private ProcurementRequestService $prService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('procurement_request.read');

        $requests = $this->prService->paginate(
            filters: [
                'search' => $request->search,
                'status' => $request->status,
                'priority' => $request->priority,
                'product_id' => $request->product_id,
            ],
            perPage: $request->per_page ?? 15
        );

        return $this->successResponse(
            ProcurementRequestResource::collection($requests),
            'Procurement requests retrieved successfully'
        );
    }

    public function store(StoreProcurementRequestRequest $request)
    {
        $this->authorize('procurement_request.create');

        $pr = $this->prService->create($request->validated());

        $this->logActivity('procurement_request.created', null, ['pr_id' => $pr->id, 'product_id' => $pr->product_id]);

        return $this->successResponse(
            new ProcurementRequestResource($pr->load('product')),
            'Procurement request created successfully',
            201
        );
    }

    public function show(ProcurementRequest $procurementRequest)
    {
        $this->authorize('procurement_request.read');

        $procurementRequest->load(['product', 'generatedBy', 'reviewedBy']);

        return $this->successResponse(
            new ProcurementRequestResource($procurementRequest),
            'Procurement request retrieved successfully'
        );
    }

    public function update(UpdateProcurementRequestRequest $request, ProcurementRequest $procurementRequest)
    {
        $this->authorize('procurement_request.update');

        if (!in_array($procurementRequest->status->value, ['generated', 'reviewed'])) {
            return $this->errorResponse('Cannot update procurement request in current status', 409);
        }

        $oldData = $procurementRequest->toArray();
        $procurementRequest = $this->prService->update($procurementRequest, $request->validated());

        $this->logActivity('procurement_request.updated', null, [
            'pr_id' => $procurementRequest->id,
            'old' => $oldData,
            'new' => $procurementRequest->toArray()
        ]);

        return $this->successResponse(
            new ProcurementRequestResource($procurementRequest->load('product')),
            'Procurement request updated successfully'
        );
    }

    public function destroy(ProcurementRequest $procurementRequest)
    {
        $this->authorize('procurement_request.delete');

        if (!in_array($procurementRequest->status->value, ['generated', 'dismissed'])) {
            return $this->errorResponse('Can only delete generated or dismissed requests', 409);
        }

        $this->prService->delete($procurementRequest);

        $this->logActivity('procurement_request.deleted', null, ['pr_id' => $procurementRequest->id]);

        return $this->successResponse(null, 'Procurement request deleted successfully');
    }

    public function generateAutomatic(Request $request)
    {
        $this->authorize('procurement_request.generate');

        $requests = $this->prService->generateAutomaticRequests();

        $this->logActivity('procurement_requests.auto_generated', null, ['count' => count($requests)]);

        return $this->successResponse(
            ProcurementRequestResource::collection($requests),
            count($requests) . ' procurement requests generated successfully',
            201
        );
    }

    public function review(Request $request, ProcurementRequest $procurementRequest)
    {
        $this->authorize('procurement_request.review');

        if ($procurementRequest->status->value !== 'generated') {
            return $this->errorResponse('Can only review generated requests', 409);
        }

        $request->validate([
            'action' => 'required|in:approve,modify,dismiss',
            'suggested_quantity' => 'required_if:action,modify|integer|min:1',
            'review_notes' => 'nullable|string|max:500'
        ]);

        $procurementRequest = $this->prService->review(
            $procurementRequest,
            $request->action,
            auth()->id(),
            $request->suggested_quantity,
            $request->review_notes
        );

        $this->logActivity('procurement_request.reviewed', null, [
            'pr_id' => $procurementRequest->id,
            'action' => $request->action
        ]);

        return $this->successResponse(
            new ProcurementRequestResource($procurementRequest->refresh()->load(['product', 'reviewedBy'])),
            'Procurement request reviewed successfully'
        );
    }

    public function convertToPo(Request $request, ProcurementRequest $procurementRequest)
    {
        $this->authorize('procurement_request.convert');

        if (!in_array($procurementRequest->status->value, ['reviewed', 'approved'])) {
            return $this->errorResponse('Can only convert reviewed or approved requests', 409);
        }

        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'unit_cost' => 'required|numeric|min:0',
            'expected_delivery_date' => 'required|date|after:today'
        ]);

        try {
            $po = $this->prService->convertToPurchaseOrder(
                $procurementRequest,
                $request->supplier_id,
                $request->unit_cost,
                $request->expected_delivery_date
            );

            $this->logActivity('procurement_request.converted_to_po', null, [
                'pr_id' => $procurementRequest->id,
                'po_id' => $po->id
            ]);

            return $this->successResponse(
                ['procurement_request' => new ProcurementRequestResource($procurementRequest->refresh()), 'purchase_order_id' => $po->id],
                'Procurement request converted to purchase order successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}
