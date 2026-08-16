<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Services\FEFOService;
use App\Modules\Inventory\Repositories\BatchRepository;
use App\Modules\Inventory\Requests\StoreBatchRequest;
use App\Modules\Inventory\Requests\UpdateBatchRequest;
use App\Modules\Inventory\Resources\BatchResource;
use Illuminate\Http\Request;

class BatchController extends BaseController
{
    public function __construct(
        private BatchRepository $batchRepository,
        private InventoryService $inventoryService,
        private FEFOService $fefoService
    ) {}

    /**
     * Display a listing of batches.
     */
    public function index(Request $request)
    {
        $this->authorize('batch.read');

        $batches = $this->batchRepository->paginate(
            filters: [
                'product_id' => $request->product_id,
                'status' => $request->status,
                'expiring_soon' => $request->boolean('expiring_soon'),
                'expired' => $request->boolean('expired'),
                'search' => $request->search
            ],
            perPage: $request->per_page ?? 15,
            with: ['product', 'stockTransactions']
        );

        return $this->successResponse(
            BatchResource::collection($batches),
            'Batches retrieved successfully'
        );
    }

    /**
     * Store a newly created batch.
     */
    public function store(StoreBatchRequest $request)
    {
        $this->authorize('batch.create');

        $batch = $this->batchRepository->create($request->validated());

        $this->logActivity('batch.created', $batch, $request->validated());

        return $this->successResponse(
            new BatchResource($batch),
            'Batch created successfully',
            201
        );
    }

    /**
     * Display the specified batch.
     */
    public function show(Batch $batch)
    {
        $this->authorize('batch.read');

        $batch->load(['product', 'stockTransactions' => function($query) {
            $query->with(['user'])->orderBy('created_at', 'desc');
        }]);

        return $this->successResponse(
            new BatchResource($batch),
            'Batch retrieved successfully'
        );
    }

    /**
     * Update the specified batch.
     */
    public function update(UpdateBatchRequest $request, Batch $batch)
    {
        $this->authorize('batch.update');

        $oldData = $batch->toArray();
        $batch = $this->batchRepository->update($batch, $request->validated());

        $this->logActivity('batch.updated', $batch, [
            'old' => $oldData,
            'new' => $request->validated()
        ]);

        return $this->successResponse(
            new BatchResource($batch),
            'Batch updated successfully'
        );
    }

    /**
     * Remove the specified batch.
     */
    public function destroy(Batch $batch)
    {
        $this->authorize('batch.delete');

        // Check if batch has current quantity
        if ($batch->current_quantity > 0) {
            return $this->errorResponse('Cannot delete batch with current stock', 409);
        }

        $this->batchRepository->delete($batch);

        $this->logActivity('batch.deleted', $batch);

        return $this->successResponse(
            null,
            'Batch deleted successfully'
        );
    }

    /**
     * Get batches expiring soon.
     */
    public function expiringSoon(Request $request)
    {
        $this->authorize('batch.read');

        $days = $request->days ?? 60; // Default to 60 days

        $batches = $this->batchRepository->getExpiringSoon($days, $request->per_page ?? 15);

        return $this->successResponse(
            BatchResource::collection($batches),
            "Batches expiring within {$days} days retrieved successfully"
        );
    }

    /**
     * Get expired batches.
     */
    public function expired(Request $request)
    {
        $this->authorize('batch.read');

        $batches = $this->batchRepository->getExpired($request->per_page ?? 15);

        return $this->successResponse(
            BatchResource::collection($batches),
            'Expired batches retrieved successfully'
        );
    }

    /**
     * Get FEFO picking order for a product.
     */
    public function fefoOrder(Request $request)
    {
        $this->authorize('batch.read');

        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1'
        ]);

        $pickingOrder = $this->fefoService->getPickingOrder(
            $request->product_id,
            $request->quantity
        );

        return $this->successResponse(
            $pickingOrder,
            'FEFO picking order retrieved successfully'
        );
    }

    /**
     * Reserve batches for an order.
     */
    public function reserve(Request $request, Batch $batch)
    {
        $this->authorize('batch.update');

        $request->validate([
            'quantity' => 'required|integer|min:1|max:' . $batch->available_quantity,
            'reserved_for' => 'required|string',
            'reserved_until' => 'nullable|date|after:now'
        ]);

        try {
            $reservation = $this->inventoryService->reserveBatch(
                $batch,
                $request->quantity,
                $request->reserved_for,
                $request->reserved_until
            );

            $this->logActivity('batch.reserved', $batch, [
                'quantity' => $request->quantity,
                'reserved_for' => $request->reserved_for,
                'reserved_until' => $request->reserved_until
            ]);

            return $this->successResponse(
                $reservation,
                'Batch reserved successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 409);
        }
    }

    /**
     * Release batch reservation.
     */
    public function releaseReservation(Batch $batch)
    {
        $this->authorize('batch.update');

        try {
            $this->inventoryService->releaseBatchReservation($batch);

            $this->logActivity('batch.reservation_released', $batch);

            return $this->successResponse(
                null,
                'Batch reservation released successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 409);
        }
    }

    /**
     * Get batch history.
     */
    public function history(Batch $batch)
    {
        $this->authorize('batch.read');

        $history = $this->batchRepository->getHistory($batch);

        return $this->successResponse(
            $history,
            'Batch history retrieved successfully'
        );
    }

    /**
     * Mark batch as expired.
     */
    public function markExpired(Batch $batch)
    {
        $this->authorize('batch.update');

        try {
            $batch = $this->inventoryService->markBatchExpired($batch);

            $this->logActivity('batch.marked_expired', $batch);

            return $this->successResponse(
                new BatchResource($batch),
                'Batch marked as expired successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 409);
        }
    }
}