<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Services\DamageReportService;
use App\Modules\Inventory\Requests\StoreDamageReportRequest;
use App\Modules\Inventory\Requests\UpdateDamageReportRequest;
use App\Modules\Inventory\Resources\DamageReportResource;
use Illuminate\Http\Request;

class DamageReportController extends BaseController
{
    public function __construct(
        private DamageReportService $damageReportService
    ) {}

    /**
     * Display a listing of damage reports.
     */
    public function index(Request $request)
    {
        $this->authorize('damage_report.read');

        $query = DamageReport::with(['product', 'batch', 'reporter', 'investigator']);

        // Filters
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        if ($request->filled('damage_type')) {
            $query->where('damage_type', $request->damage_type);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('overdue_investigation')) {
            $query->overdueInvestigation();
        }

        $reports = $query->latest('reported_at')->paginate($request->per_page ?? 15);

        return $this->successResponse(
            DamageReportResource::collection($reports),
            'Damage reports retrieved successfully'
        );
    }

    /**
     * Store a newly created damage report.
     */
    public function store(StoreDamageReportRequest $request)
    {
        $this->authorize('damage_report.create');

        try {
            $report = $this->damageReportService->createDamageReport(
                $request->validated(),
                auth()->user()
            );

            $this->logActivity('damage_report.created', $report->product, [
                'report_id' => $report->id,
                'damage_type' => $report->damage_type->value,
                'quantity' => $report->quantity_damaged,
            ]);

            return $this->successResponse(
                new DamageReportResource($report->load(['product', 'batch'])),
                'Damage report created successfully',
                201
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Display the specified damage report.
     */
    public function show(DamageReport $damageReport)
    {
        $this->authorize('damage_report.read');

        $damageReport->load(['product', 'batch', 'reporter', 'investigator']);

        return $this->successResponse(
            new DamageReportResource($damageReport),
            'Damage report retrieved successfully'
        );
    }

    /**
     * Update the specified damage report.
     */
    public function update(UpdateDamageReportRequest $request, DamageReport $damageReport)
    {
        $this->authorize('damage_report.update');

        if ($damageReport->status !== 'reported') {
            return $this->errorResponse('Can only update reports in reported status', 409);
        }

        $damageReport->update($request->validated());

        $this->logActivity('damage_report.updated', $damageReport->product, [
            'report_id' => $damageReport->id,
        ]);

        return $this->successResponse(
            new DamageReportResource($damageReport->refresh()),
            'Damage report updated successfully'
        );
    }

    /**
     * Remove the specified damage report.
     */
    public function destroy(DamageReport $damageReport)
    {
        $this->authorize('damage_report.delete');

        if (!in_array($damageReport->status, ['reported'])) {
            return $this->errorResponse('Cannot delete damage report in current status', 409);
        }

        $damageReport->delete();

        $this->logActivity('damage_report.deleted', $damageReport->product, [
            'report_id' => $damageReport->id,
        ]);

        return $this->successResponse(null, 'Damage report deleted successfully');
    }

    /**
     * Assign investigator to a damage report.
     */
    public function assignInvestigator(Request $request, DamageReport $damageReport)
    {
        $this->authorize('damage_report.investigate');

        if (!$damageReport->canBeInvestigated()) {
            return $this->errorResponse('Report cannot be assigned for investigation in current status', 409);
        }

        $request->validate([
            'investigator_id' => 'required|exists:users,id',
        ]);

        $investigator = \App\Models\User::findOrFail($request->investigator_id);
        $damageReport->assignInvestigator($investigator);

        $this->logActivity('damage_report.investigator_assigned', $damageReport->product, [
            'report_id' => $damageReport->id,
            'investigator_id' => $investigator->id,
            'investigator_name' => $investigator->name,
        ]);

        return $this->successResponse(
            new DamageReportResource($damageReport->refresh()),
            'Investigator assigned successfully'
        );
    }

    /**
     * Complete investigation of a damage report.
     */
    public function completeInvestigation(Request $request, DamageReport $damageReport)
    {
        $this->authorize('damage_report.investigate');

        $request->validate([
            'investigation_notes' => 'required|string|max:2000',
            'action_taken' => 'nullable|string|max:500',
        ]);

        if (!$damageReport->completeInvestigation(
            $request->investigation_notes,
            $request->action_taken
        )) {
            return $this->errorResponse('Investigation cannot be completed in current status', 409);
        }

        $this->logActivity('damage_report.investigation_completed', $damageReport->product, [
            'report_id' => $damageReport->id,
        ]);

        return $this->successResponse(
            new DamageReportResource($damageReport->refresh()),
            'Investigation completed successfully'
        );
    }

    /**
     * Approve a damage report and write off inventory.
     */
    public function approve(Request $request, DamageReport $damageReport)
    {
        $this->authorize('damage_report.approve');

        if (!$damageReport->canBeApproved()) {
            return $this->errorResponse('Report cannot be approved in current status', 409);
        }

        $request->validate([
            'resolution_notes' => 'nullable|string|max:1000',
        ]);

        try {
            $result = $this->damageReportService->approveDamageReport(
                $damageReport,
                auth()->user()
            );

            if ($request->filled('resolution_notes')) {
                $damageReport->refresh()->update([
                    'investigation_notes' => trim($damageReport->investigation_notes . "\n\nApproval notes: " . $request->resolution_notes),
                ]);
            }

            $this->logActivity('damage_report.approved', $damageReport->product, [
                'report_id' => $damageReport->id,
                'quantity_written_off' => $damageReport->quantity_damaged,
                'estimated_value' => $damageReport->estimated_value,
                'transaction_id' => $result['transaction']->id,
            ]);

            return $this->successResponse(
                [
                    'report' => new DamageReportResource($damageReport->refresh()),
                    'transaction' => [
                        'id' => $result['transaction']->id,
                        'quantity' => $result['transaction']->quantity,
                        'type' => $result['transaction']->type->value,
                    ],
                    'reservations' => $result['reservations'],
                ],
                'Damage report approved and inventory written off successfully'
            );
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Reject a damage report.
     */
    public function reject(Request $request, DamageReport $damageReport)
    {
        $this->authorize('damage_report.approve');

        if (!$damageReport->canBeApproved()) {
            return $this->errorResponse('Report cannot be rejected in current status', 409);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $damageReport->update([
            // Keep status as 'investigated' since 'rejected' is not in migration enum
            'investigation_notes' => $damageReport->investigation_notes . 
                "\n\n" . DamageReport::REJECTION_MARKER . ' ' . $request->rejection_reason,
        ]);

        $this->logActivity('damage_report.rejected', $damageReport->product, [
            'report_id' => $damageReport->id,
            'rejection_reason' => $request->rejection_reason,
        ]);

        return $this->successResponse(
            new DamageReportResource($damageReport->refresh()),
            'Damage report rejected'
        );
    }

    /**
     * Get damage report statistics.
     */
    public function statistics(Request $request)
    {
        $this->authorize('damage_report.read');

        $days = $request->days ?? 30;
        $stats = DamageReport::getDamageSummary($days);

        return $this->successResponse(
            $stats,
            "Damage statistics for last {$days} days retrieved successfully"
        );
    }

    /**
     * Get reports pending review.
     */
    public function pendingReview(Request $request)
    {
        $this->authorize('damage_report.read');

        $reports = DamageReport::investigated()
            ->with(['product', 'batch', 'reporter', 'investigator'])
            ->latest('investigated_at')
            ->paginate($request->per_page ?? 15);

        return $this->successResponse(
            DamageReportResource::collection($reports),
            'Reports pending review retrieved successfully'
        );
    }
}
