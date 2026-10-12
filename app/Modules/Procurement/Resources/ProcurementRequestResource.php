<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Inventory\Resources\ProductResource;

class ProcurementRequestResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'current_stock' => $this->current_stock,
            'reorder_point' => $this->reorder_point,
            'suggested_quantity' => $this->suggested_quantity,
            'priority' => $this->priority->value,
            'priority_label' => $this->priority->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'generated_by' => $this->generated_by,
            'generated_at' => $this->generated_at?->toISOString(),
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'review_notes' => $this->review_notes,
            'notes' => $this->notes,
            'generator' => $this->whenLoaded('generatedBy', fn() => [
                'id' => $this->generatedBy->id,
                'name' => $this->generatedBy->name,
            ]),
            'reviewer' => $this->whenLoaded('reviewedBy', fn() => [
                'id' => $this->reviewedBy->id,
                'name' => $this->reviewedBy->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
