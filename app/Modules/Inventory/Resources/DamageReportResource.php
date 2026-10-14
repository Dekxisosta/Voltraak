<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DamageReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->name,
            'product_sku' => $this->product?->sku,
            'batch_id' => $this->batch_id,
            'batch_number' => $this->batch?->batch_number,
            'quantity_damaged' => $this->quantity_damaged,
            'damage_type' => $this->damage_type->value,
            'damage_type_display' => $this->damage_type->getDisplayName(),
            'severity' => $this->severity ?? 'minor',
            'description' => $this->description,
            'estimated_value' => (float) $this->estimated_value,
            'photo_path' => $this->photo_path,
            'status' => $this->status,
            'is_rejected' => $this->isRejected(),
            'investigated_by' => $this->investigated_by,
            'reported_at' => $this->reported_at->toISOString(),
            'investigated_at' => $this->investigated_at?->toISOString(),
            'investigation_notes' => $this->investigation_notes,
            'action_taken' => $this->action_taken,
            'days_since_reported' => $this->days_since_reported,
            'is_overdue_for_investigation' => $this->isOverdueForInvestigation(),
            
            // Relationships
            'reporter' => $this->whenLoaded('reporter', [
                'id' => $this->reporter->id,
                'name' => $this->reporter->name,
            ]),
            
            'investigator' => $this->whenLoaded('investigator', function () {
                return $this->investigator ? [
                    'id' => $this->investigator->id,
                    'name' => $this->investigator->name,
                ] : null;
            }),
            
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
