<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Models\User;
use App\Support\Enums\DamageType;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use App\Core\Exceptions\ConflictException;
use Illuminate\Support\Facades\DB;

/**
 * Handles damage report creation, investigation, and approval
 */
class DamageReportService
{
    public function __construct(
        private InventoryService $inventoryService,
        private ActivityLogger $activityLogger,
        private NotificationService $notificationService
    ) {}

    /**
     * Create a new damage report.
     */
    public function createDamageReport(array $data, User $reporter): DamageReport
    {
        return DB::transaction(function () use ($data, $reporter) {
            $product = Product::findOrFail($data['product_id']);
            
            $batch = null;
            if (!empty($data['batch_id'])) {
                $batch = Batch::findOrFail($data['batch_id']);
                
                if ($batch->product_id !== $product->id) {
                    throw new ConflictException('Batch does not belong to the specified product');
                }
            }

            // Calculate estimated value if not provided
            $estimatedValue = $data['estimated_value'] ?? null;
            if (!$estimatedValue) {
                $unitCost = $batch?->unit_cost ?? $product->unit_price;
                $estimatedValue = $data['quantity_damaged'] * $unitCost;
            }

            $report = DamageReport::create([
                'product_id' => $product->id,
                'batch_id' => $batch?->id,
                'quantity_damaged' => $data['quantity_damaged'],
                'damage_type' => $data['damage_type'],
                'severity' => $data['severity'] ?? 'minor',
                'description' => $data['description'],
                'estimated_value' => $estimatedValue,
                'photo_path' => $data['photo_path'] ?? null,
                'reported_by' => $reporter->id,
                'reported_at' => now(),
                'status' => 'reported',
            ]);

            // Notify managers about new damage report
            $this->notificationService->sendBulkNotification(
                'damage_report_created',
                "New damage report: {$product->name} - {$data['quantity_damaged']} units",
                ['manager'],
                ['report_id' => $report->id]
            );

            return $report;
        });
    }

    /**
     * Approve damage report and write off inventory.
     * 
     * Creates proper stock adjustment transaction via InventoryService.
     */
    public function approveDamageReport(DamageReport $report, User $approver): array
    {
        return DB::transaction(function () use ($report, $approver) {
            // Re-read under a lock so two approvals of the same report cannot
            // both pass the status check and write the stock off twice.
            $report = DamageReport::whereKey($report->id)->lockForUpdate()->firstOrFail();

            if (!$report->canBeApproved()) {
                throw new ConflictException(
                    "Damage report cannot be approved. Current status: {$report->status}"
                );
            }

            // Signed ADJUSTMENT through the single stock writer; moves the
            // batch (when the report names one) and the product together.
            $transaction = $this->inventoryService->adjustStock([
                'product_id' => $report->product_id,
                'batch_id' => $report->batch_id,
                'adjustment_quantity' => -$report->quantity_damaged, // Negative = decrease
                'reference_type' => 'damage_report',
                'reference_id' => $report->id,
                'notes' => "Write-off due to damage: {$report->damage_type->getDisplayName()} - " . 
                          ($report->description ?? 'No description provided'),
            ], $approver);

            // Reservations allocated to this batch may now promise stock that
            // is no longer there: move them to another batch, or hand them
            // back for re-allocation. (A report with no batch only lowers the
            // product total, so there is no batch allocation to fix.)
            $reservations = $report->batch_id
                ? $this->inventoryService->reconcileReservationsForBatch(Batch::findOrFail($report->batch_id))
                : ['reallocated' => [], 'unallocated' => []];

            // Mark report as approved
            $report->update([
                'status' => 'approved',
            ]);

            $this->activityLogger->logInventoryOperation(
                'damage_writeoff',
                $report->product->sku,
                $report->quantity_damaged,
                $approver,
                [
                    'report_id' => $report->id,
                    'damage_type' => $report->damage_type->value,
                    'estimated_value' => $report->estimated_value,
                    'transaction_id' => $transaction->id,
                ]
            );

            return [
                'report' => $report,
                'transaction' => $transaction,
                'reservations' => $reservations,
            ];
        });
    }

    /**
     * Auto-assign overdue reports to investigators.
     */
    public function assignOverdueReports(int $days = 7): int
    {
        $overdueReports = DamageReport::reported()
            ->overdueInvestigation($days)
            ->get();

        if ($overdueReports->isEmpty()) {
            return 0;
        }

        // Get available investigators (managers or inventory staff)
        $investigators = User::whereIn('role', ['manager', 'inventory_staff'])
            ->where('is_active', true)
            ->get();

        if ($investigators->isEmpty()) {
            return 0;
        }

        $assigned = 0;
        foreach ($overdueReports as $report) {
            // Round-robin assignment
            $investigator = $investigators[$assigned % $investigators->count()];
            
            if ($report->assignInvestigator($investigator)) {
                $this->notificationService->sendNotification(
                    'damage_investigation_assigned',
                    "Overdue damage report has been assigned to you",
                    [$investigator->id],
                    ['report_id' => $report->id]
                );
                
                $assigned++;
            }
        }

        return $assigned;
    }

    /**
     * Get damage cost summary by type.
     */
    public function getDamageCostByType(int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $reports = DamageReport::where('reported_at', '>=', $startDate)
            ->whereIn('status', ['approved', 'written_off'])
            ->get();

        $byType = [];
        foreach (DamageType::cases() as $type) {
            $typeReports = $reports->where('damage_type', $type);
            $byType[$type->value] = [
                'count' => $typeReports->count(),
                'total_quantity' => $typeReports->sum('quantity_damaged'),
                'total_value' => (float) $typeReports->sum('estimated_value'),
                'display_name' => $type->getDisplayName(),
            ];
        }

        return [
            'period_days' => $days,
            'total_reports' => $reports->count(),
            'total_value' => (float) $reports->sum('estimated_value'),
            'by_type' => $byType,
        ];
    }

    /**
     * Get investigation performance metrics.
     */
    public function getInvestigationMetrics(int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $reports = DamageReport::where('reported_at', '>=', $startDate)->get();
        
        $investigated = $reports->whereNotNull('investigated_at');
        
        if ($investigated->isEmpty()) {
            return [
                'period_days' => $days,
                'total_reports' => $reports->count(),
                'investigated_count' => 0,
                'average_investigation_time_hours' => null,
                'overdue_count' => $reports->where('status', 'reported')->count(),
            ];
        }

        $totalHours = $investigated->sum(function ($report) {
            return $report->reported_at->diffInHours($report->investigated_at);
        });

        return [
            'period_days' => $days,
            'total_reports' => $reports->count(),
            'investigated_count' => $investigated->count(),
            'average_investigation_time_hours' => round($totalHours / $investigated->count(), 2),
            'overdue_count' => $reports->filter->isOverdueForInvestigation()->count(),
            'investigation_rate' => round(($investigated->count() / max(1, $reports->count())) * 100, 2),
        ];
    }
}
