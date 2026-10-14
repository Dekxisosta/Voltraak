<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\DiscrepancyReport;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Requests\StoreDiscrepancyReportRequest;
use App\Modules\Inventory\Resources\DiscrepancyReportResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class DiscrepancyReportController extends BaseController
{
    public function __construct(
        private InventoryService $inventoryService
    ) {}

    /**
     * Display a listing of discrepancy reports.
     */
    public function index(Request $request)
    {
        $query = DiscrepancyReport::with(['product', 'batch', 'reporter', 'physicalCount']);

        // Inventory staff and up see every report. Warehouse staff may only
        // raise reports, so they get back just the ones they raised.
        if (!Gate::allows('discrepancy_report.read')) {
            $this->authorize('discrepancy_report.create');
            $query->where('reported_by', auth()->id());
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('reported_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('reported_at', '<=', $request->end_date);
        }

        $discrepancies = $query->latest('reported_at')->paginate($request->per_page ?? 15);

        return $this->successResponse(
            DiscrepancyReportResource::collection($discrepancies),
            'Discrepancy reports retrieved successfully'
        );
    }

    /**
     * Raise a discrepancy report.
     */
    public function store(StoreDiscrepancyReportRequest $request)
    {
        $this->authorize('discrepancy_report.create');

        $data = $request->validated();
        $expected = (int) $data['expected_quantity'];
        $actual = (int) $data['actual_quantity'];
        $variance = $actual - $expected;
        $type = $data['discrepancy_type'] ?? ($variance > 0 ? 'overage' : 'shortage');

        $description = $data['notes'] ?? null;
        if (!$description) {
            $description = $variance === 0
                ? 'Count confirmed - no variance'
                : sprintf('%s of %d unit(s): expected %d, counted %d', ucfirst($type), abs($variance), $expected, $actual);
        }

        $report = DiscrepancyReport::create([
            'product_id' => $data['product_id'],
            'batch_id' => $data['batch_id'] ?? null,
            'location' => $data['location'] ?? null,
            'type' => 'counting',
            'discrepancy_type' => $type,
            'expected_quantity' => $expected,
            'actual_quantity' => $actual,
            'description' => $description,
            'status' => 'open',
            'reported_by' => auth()->id(),
            'reported_at' => now(),
            'root_cause' => in_array($type, ['theft', 'damage'], true) ? $type : null,
        ]);

        $this->logActivity('discrepancy_report.created', $report->product, [
            'discrepancy_id' => $report->id,
            'variance' => $variance,
        ]);

        return $this->successResponse(
            new DiscrepancyReportResource($report->load(['product', 'batch', 'reporter', 'physicalCount'])),
            'Discrepancy report created successfully',
            201
        );
    }

    /**
     * Move a report through the open / investigating / resolved workflow.
     *
     * This only records the investigation state. Any stock correction goes
     * through the manager's adjustment approval (see sendForApproval), never
     * straight from here.
     */
    public function updateStatus(Request $request, DiscrepancyReport $discrepancyReport)
    {
        $this->authorize('discrepancy_report.update');

        $request->validate([
            'status' => 'required|in:open,investigating,resolved',
            'resolution_notes' => 'nullable|string|max:1000',
        ]);

        if ($discrepancyReport->status === 'closed') {
            return $this->errorResponse('Closed discrepancy reports cannot be changed', 409);
        }

        $status = $request->status;
        $changes = ['status' => $status];

        if ($status === 'investigating') {
            $changes['assigned_to'] = auth()->id();
            $changes['resolved_at'] = null;
        } elseif ($status === 'resolved') {
            $changes['resolved_at'] = now();
            if ($request->filled('resolution_notes')) {
                $changes['resolution_notes'] = $request->resolution_notes;
            }
        } else {
            $changes['resolved_at'] = null;
        }

        $discrepancyReport->update($changes);

        $this->logActivity('discrepancy_report.status_changed', $discrepancyReport->product, [
            'discrepancy_id' => $discrepancyReport->id,
            'status' => $status,
        ]);

        return $this->successResponse(
            new DiscrepancyReportResource($discrepancyReport->refresh()->load(['product', 'batch', 'reporter', 'physicalCount'])),
            'Discrepancy report updated successfully'
        );
    }

    /**
     * Send a report with a significant variance to the manager's adjustment
     * approval queue. The queue is made of physical counts, so a count
     * carrying this report's quantities is recorded and linked; stock is only
     * adjusted when the manager approves it.
     */
    public function sendForApproval(DiscrepancyReport $discrepancyReport)
    {
        $this->authorize('discrepancy_report.update');

        if ($discrepancyReport->physical_count_id) {
            return $this->errorResponse('This report has already been sent for approval', 409);
        }

        $variance = $discrepancyReport->actual_quantity - $discrepancyReport->expected_quantity;
        if ($variance === 0) {
            return $this->errorResponse('A report without a variance does not need approval', 422);
        }

        try {
            $count = DB::transaction(function () use ($discrepancyReport) {
                $count = PhysicalCount::create([
                    'product_id' => $discrepancyReport->product_id,
                    'counted_by' => auth()->id(),
                    'system_quantity' => $discrepancyReport->expected_quantity,
                    'counted_quantity' => $discrepancyReport->actual_quantity,
                    'count_reference' => sprintf('DISC-%s-%03d', $discrepancyReport->reported_at?->format('Y') ?? now()->format('Y'), $discrepancyReport->id),
                    'notes' => "Sent for approval from discrepancy report #{$discrepancyReport->id}: {$discrepancyReport->description}",
                    'count_date' => now(),
                ]);

                if (!$count->exceeds_threshold) {
                    // Rolled back by the exception below.
                    throw new \RuntimeException('Variance is within the tolerance threshold and does not need approval');
                }

                $discrepancyReport->update(['physical_count_id' => $count->id]);

                return $count;
            });
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        $this->logActivity('discrepancy_report.sent_for_approval', $discrepancyReport->product, [
            'discrepancy_id' => $discrepancyReport->id,
            'physical_count_id' => $count->id,
        ]);

        return $this->successResponse(
            new DiscrepancyReportResource($discrepancyReport->refresh()->load(['product', 'batch', 'reporter', 'physicalCount'])),
            'Discrepancy report sent for manager approval'
        );
    }

    /**
     * Display the specified discrepancy report.
     */
    public function show(DiscrepancyReport $discrepancyReport)
    {
        $this->authorize('discrepancy_report.read');

        $discrepancyReport->load(['product', 'batch', 'reporter', 'physicalCount']);

        return $this->successResponse(
            new DiscrepancyReportResource($discrepancyReport),
            'Discrepancy report retrieved successfully'
        );
    }

    /**
     * Approve discrepancy and create stock adjustment.
     */
    public function approve(Request $request, DiscrepancyReport $discrepancyReport)
    {
        $this->authorize('discrepancy_report.approve');

        if ($discrepancyReport->status !== 'pending') {
            return $this->errorResponse('Only pending discrepancies can be approved', 409);
        }

        $request->validate([
            'adjustment_notes' => 'nullable|string|max:1000',
        ]);

        try {
            $result = DB::transaction(function () use ($discrepancyReport, $request) {
                // Lock the discrepancy report
                $discrepancyReport->lockForUpdate();

                // Create or link to a physical count for audit trail
                $physicalCount = PhysicalCount::create([
                    'product_id' => $discrepancyReport->product_id,
                    'batch_id' => $discrepancyReport->batch_id,
                    'counter_user_id' => auth()->id(),
                    'count_date' => now(),
                    'system_quantity' => $discrepancyReport->system_quantity,
                    'counted_quantity' => $discrepancyReport->actual_quantity,
                    'variance' => $discrepancyReport->variance,
                    'variance_percentage' => $discrepancyReport->variance_percentage,
                    'variance_approved' => true,
                    'approved_by' => auth()->id(),
                    'approved_at' => now(),
                    'notes' => "Created from discrepancy report #{$discrepancyReport->id}. " . 
                              ($request->adjustment_notes ?? ''),
                    'created_at' => $discrepancyReport->reported_at, // Use original report date
                ]);

                // Apply the stock adjustment through InventoryService
                $delta = $discrepancyReport->actual_quantity - $discrepancyReport->system_quantity;
                
                if ($delta !== 0) {
                    $transaction = $this->inventoryService->adjustStock([
                        'product_id' => $discrepancyReport->product_id,
                        'batch_id' => $discrepancyReport->batch_id,
                        'quantity' => abs($delta),
                        'adjustment_type' => $delta > 0 ? 'increase' : 'decrease',
                        'reference_type' => 'discrepancy_report',
                        'reference_id' => $discrepancyReport->id,
                        'reference_number' => "DISC-{$discrepancyReport->id}",
                        'notes' => "Discrepancy adjustment: {$discrepancyReport->notes}. " .
                                  ($request->adjustment_notes ?? ''),
                    ], auth()->user());

                    // Link the transaction to the physical count
                    $physicalCount->update(['stock_transaction_id' => $transaction->id]);
                }

                // Update discrepancy status
                $discrepancyReport->update([
                    'status' => 'approved',
                    'approved_by' => auth()->id(),
                    'approved_at' => now(),
                    'physical_count_id' => $physicalCount->id,
                    'resolution_notes' => $request->adjustment_notes,
                ]);

                return [
                    'discrepancy' => $discrepancyReport->fresh(),
                    'physical_count' => $physicalCount,
                    'adjustment_applied' => $delta !== 0,
                    'adjustment_amount' => $delta,
                ];
            });

            $this->logActivity('discrepancy_report.approved', $discrepancyReport->product, [
                'discrepancy_id' => $discrepancyReport->id,
                'adjustment_amount' => $result['adjustment_amount'],
            ]);

            return $this->successResponse(
                $result,
                'Discrepancy approved and stock adjusted successfully'
            );
            
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Reject discrepancy report.
     */
    public function reject(Request $request, DiscrepancyReport $discrepancyReport)
    {
        $this->authorize('discrepancy_report.approve');

        if ($discrepancyReport->status !== 'pending') {
            return $this->errorResponse('Only pending discrepancies can be rejected', 409);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $discrepancyReport->update([
            'status' => 'rejected',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
            'resolution_notes' => $request->rejection_reason,
        ]);

        $this->logActivity('discrepancy_report.rejected', $discrepancyReport->product, [
            'discrepancy_id' => $discrepancyReport->id,
            'rejection_reason' => $request->rejection_reason,
        ]);

        return $this->successResponse(
            $discrepancyReport->fresh(),
            'Discrepancy report rejected'
        );
    }

    /**
     * Get statistics for discrepancy reports.
     */
    public function statistics(Request $request)
    {
        $this->authorize('discrepancy_report.read');

        $days = $request->integer('days', 30);
        $startDate = now()->subDays($days);

        $discrepancies = DiscrepancyReport::where('reported_at', '>=', $startDate)->get();

        $stats = [
            'period_days' => $days,
            'total_reports' => $discrepancies->count(),
            'by_status' => $discrepancies->groupBy('status')->map->count(),
            'total_variance_value' => $discrepancies->sum('variance_value'),
            'average_variance_percentage' => $discrepancies->avg('variance_percentage'),
            'pending_count' => $discrepancies->where('status', 'pending')->count(),
            'approved_count' => $discrepancies->where('status', 'approved')->count(),
            'rejected_count' => $discrepancies->where('status', 'rejected')->count(),
            'by_product' => $discrepancies->groupBy('product_id')
                ->map(function ($group) {
                    return [
                        'count' => $group->count(),
                        'total_variance' => $group->sum('variance_value'),
                    ];
                })->sortByDesc('count')->take(10),
        ];

        return $this->successResponse($stats, 'Discrepancy statistics retrieved successfully');
    }
}