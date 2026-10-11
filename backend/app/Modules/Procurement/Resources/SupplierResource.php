<?php

namespace App\Modules\Procurement\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'contact_person' => $this->contact_person,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'country' => $this->country,
            'tax_id' => $this->tax_id,
            'payment_terms' => $this->payment_terms,
            'default_lead_time_days' => $this->default_lead_time_days,
            'category' => $this->category,
            'rating' => $this->rating,
            'total_orders' => $this->total_orders,
            'notes' => $this->notes,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'purchase_orders' => PurchaseOrderResource::collection($this->whenLoaded('purchaseOrders')),
        ];
    }
}
