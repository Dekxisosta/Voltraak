<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Inventory\Resources\ProductResource;

class PurchaseOrderItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'purchase_order_id' => $this->purchase_order_id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'product_name' => $this->whenLoaded('product', fn () => $this->product?->name),
            'product_sku' => $this->whenLoaded('product', fn () => $this->product?->sku),
            'quantity' => $this->quantity,
            'received_quantity' => $this->received_quantity,
            'remaining_quantity' => max(0, (int) $this->quantity - (int) ($this->received_quantity ?? 0)),
            'unit_cost' => $this->unit_cost,
            'total_cost' => $this->total_cost,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
