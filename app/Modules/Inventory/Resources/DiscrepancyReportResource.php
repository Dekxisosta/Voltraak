<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Discrepancy report in the shape the inventory discrepancies page reads
 * (variance fields are signed: actual - expected).
 */
class DiscrepancyReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $expected = (int) $this->expected_quantity;
        $actual = (int) $this->actual_quantity;
        $variance = $actual - $expected;

        $variancePercentage = $expected > 0
            ? round(($variance / $expected) * 100, 1)
            : ($actual > 0 ? 100.0 : 0.0);

        $threshold = (float) config('ims.variance.default_threshold_percent', 5.0);
        $count = $this->relationLoaded('physicalCount') ? $this->physicalCount : null;
        $product = $this->relationLoaded('product') ? $this->product : null;

        $approvalStatus = $count && $count->approval_status !== 'none' ? $count->approval_status : null;

        $discrepancyType = $this->discrepancy_type
            ?: match (true) {
                $variance < 0 => 'shortage',
                $variance > 0 => 'overage',
                default => 'count_confirmed',
            };

        return [
            'id' => $this->id,
            'report_number' => sprintf('DISC-%s-%03d', $this->reported_at?->format('Y') ?? now()->format('Y'), $this->id),
            'product_id' => $this->product_id,
            'product_name' => $product?->name,
            'product_sku' => $product?->sku,
            'batch_id' => $this->batch_id,
            'expected_quantity' => $expected,
            'actual_quantity' => $actual,
            'variance' => $variance,
            'variance_percentage' => $variancePercentage,
            'discrepancy_type' => $discrepancyType,
            'location' => $this->location,
            'priority' => abs($variance) > 2 ? 'high' : 'medium',
            'status' => $this->status,
            'notes' => $this->description,
            'investigation_notes' => $this->investigation_notes,
            'resolution_notes' => $this->resolution_notes,
            'root_cause' => $this->root_cause,
            'reported_by' => $this->relationLoaded('reporter') ? $this->reporter?->name : null,
            'reported_by_id' => $this->reported_by,
            'assigned_to' => $this->assigned_to,
            'created_at' => $this->reported_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),

            // Manager adjustment-approval linkage (via the physical count)
            'physical_count_id' => $this->physical_count_id,
            'requires_approval' => $count !== null || abs($variancePercentage) > $threshold,
            'approval_status' => $approvalStatus,
            'write_off_amount' => $variance < 0 && $product
                ? round(abs($variance) * (float) $product->unit_price, 2)
                : null,
            'approved_at' => $count?->approved_at?->toISOString(),
        ];
    }
}
