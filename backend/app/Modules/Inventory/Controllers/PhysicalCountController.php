<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Repositories\PhysicalCountRepository;
use App\Modules\Inventory\Requests\StorePhysicalCountRequest;
use App\Modules\Inventory\Requests\UpdatePhysicalCountRequest;
use App\Modules\Inventory\Resources\PhysicalCountResource;
use Illuminate\Http\Request;

class PhysicalCountController extends BaseController
{
    public function __construct(
        private PhysicalCountRepository $physicalCountRepository,
        private InventoryService $inventoryService
    ) {}

    /**
     * Display a listing of physical counts.
     */
    public function index(Request $request)
    {
        $this->authorize('physical_count.read');

        $counts = $this->physicalCountRepository->paginate(
            filters: [
                'product_id' => $request->product_id,
                'batch_id' => $request->batch_id,
                'user_id' => $request->user_id,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'has_variance' => $request->boolean('has_variance'),
                'search' => $request->search
            ],
            perPage: $request->per_page ?? 15,
            with: ['product', 'batch', 'user']
        );

        return $this->successResponse(
            PhysicalCountResource::collection($counts),
            'Physical counts retrieved successfully'
        );
    }

    /**
     * Store a newly created physical count.
     */
    public function store(StorePhysicalCountRequest $request)
    {
        $this->authorize('physical_count.create');

        try {
            $physicalCount = $this->inventoryService->recordPhysicalCount(
                $request->validated()
            );

            $this->logActivity('physical_count.created', $physicalCount->product, [
                'physical_count_id' => $physicalCount->id,
                'expected_quantity' => $physicalCount->expected_quantity,
                'actual_quantity' => $physicalCount->actual_quantity,
                'variance' => $physicalCount->variance,
                'variance_percentage' => $physicalCount->variance_percentage
            ]);

            return $this->successResponse(
                new PhysicalCountResource($physicalCount->load(['product', 'batch', 'user'])),
                'Physical count recorded successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Display the specified physical count.
     */
    public function show(PhysicalCount $physicalCount)
    {
        $this->authorize('physical_count.read');

        $physicalCount->load(['product', 'batch', 'user']);

        return $this->successResponse(
            new PhysicalCountResource($physicalCount),
            'Physical count retrieved successfully'
        );
    }

    /**
     * Update the specified physical count.
     */
    public function update(UpdatePhysicalCountRequest $request, PhysicalCount $physicalCount)
    {
        $this->authorize('physical_count.update');

        $oldData = $physicalCount->toArray();
        $physicalCount = $this->physicalCountRepository->update($physicalCount, $request->validated());

        $this->logActivity('physical_count.updated', $physicalCount->product, [
            'physical_count_id' => $physicalCount->id,
            'old' => $oldData,
            'new' => $request->validated()
        ]);

        return $this->successResponse(
            new PhysicalCountResource($physicalCount),
            'Physical count updated successfully'
        );
    }

    /**
     * Remove the specified physical count.
     */
    public function destroy(PhysicalCount $physicalCount)
    {
        $this->authorize('physical_count.delete');

        $this->physicalCountRepository->delete($physicalCount);

        $this->logActivity('physical_count.deleted', $physicalCount->product, [
            'physical_count_id' => $physicalCount->id
        ]);

        return $this->successResponse(
            null,
            'Physical count deleted successfully'
        );
    }

    /**
     * Get physical counts with variance.
     */
    public function withVariance(Request $request)
    {
        $this->authorize('physical_count.read');

        $threshold = $request->threshold ?? 5; // Default 5% variance threshold

        $counts = $this->physicalCountRepository->getWithVariance(
            $threshold,
            $request->per_page ?? 15
        );

        return $this->successResponse(
            PhysicalCountResource::collection($counts),
            "Physical counts with >{$threshold}% variance retrieved successfully"
        );
    }

    /**
     * Get recent physical counts.
     */
    public function recent(Request $request)
    {
        $this->authorize('physical_count.read');

        $days = $request->days ?? 7; // Default to last 7 days

        $counts = $this->physicalCountRepository->getRecent(
            $days,
            $request->per_page ?? 15
        );

        return $this->successResponse(
            PhysicalCountResource::collection($counts),
            "Physical counts from last {$days} days retrieved successfully"
        );
    }

    /**
     * Get physical count statistics.
     */
    public function statistics(Request $request)
    {
        $this->authorize('physical_count.read');

        $period = $request->period ?? '30'; // days
        $stats = $this->physicalCountRepository->getStatistics($period);

        return $this->successResponse(
            $stats,
            "Physical count statistics for last {$period} days retrieved successfully"
        );
    }

    /**
     * Generate physical count worksheet.
     */
    public function generateWorksheet(Request $request)
    {
        $this->authorize('physical_count.create');

        $request->validate([
            'product_ids' => 'array',
            'product_ids.*' => 'exists:products,id',
            'category' => 'nullable|string',
            'location' => 'nullable|string'
        ]);

        $worksheet = $this->inventoryService->generatePhysicalCountWorksheet(
            $request->product_ids,
            $request->category,
            $request->location
        );

        return $this->successResponse(
            $worksheet,
            'Physical count worksheet generated successfully'
        );
    }

    /**
     * Import physical count results.
     */
    public function importResults(Request $request)
    {
        $this->authorize('physical_count.create');

        $request->validate([
            'results' => 'required|array',
            'results.*.product_id' => 'required|exists:products,id',
            'results.*.batch_id' => 'nullable|exists:batches,id',
            'results.*.actual_quantity' => 'required|integer|min:0',
            'results.*.notes' => 'nullable|string'
        ]);

        try {
            $counts = $this->inventoryService->importPhysicalCountResults(
                $request->results
            );

            $this->logActivity('physical_count.bulk_imported', null, [
                'count' => count($counts),
                'total_variance' => collect($counts)->sum('variance')
            ]);

            return $this->successResponse(
                PhysicalCountResource::collection(collect($counts)),
                'Physical count results imported successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Get accuracy metrics.
     */
    public function accuracy(Request $request)
    {
        $this->authorize('physical_count.read');

        $period = $request->period ?? '30'; // days
        $accuracy = $this->physicalCountRepository->getAccuracyMetrics($period);

        return $this->successResponse(
            $accuracy,
            "Inventory accuracy metrics for last {$period} days retrieved successfully"
        );
    }

    /**
     * Approve variance adjustment.
     */
    public function approveVariance(PhysicalCount $physicalCount)
    {
        $this->authorize('physical_count.approve');

        try {
            $adjustment = $this->inventoryService->approveVarianceAdjustment($physicalCount);

            $this->logActivity('physical_count.variance_approved', $physicalCount->product, [
                'physical_count_id' => $physicalCount->id,
                'adjustment_quantity' => $adjustment['quantity'],
                'adjustment_type' => $adjustment['type']
            ]);

            return $this->successResponse(
                $adjustment,
                'Variance adjustment approved and processed successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}