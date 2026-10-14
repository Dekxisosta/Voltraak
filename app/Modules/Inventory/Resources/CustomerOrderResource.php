<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'customer_phone' => $this->customer_phone,
            'customer_address' => $this->customer_address,
            'status' => $this->status->value,
            'total_amount' => (float) $this->total_amount,
            'total_items' => $this->total_items,
            'required_date' => $this->required_date?->toDateString(),
            'fulfilled_date' => $this->fulfilled_date?->toDateString(),
            'order_date' => $this->order_date->toISOString(),
            'notes' => $this->notes,
            'is_overdue' => $this->isOverdue(),
            'days_until_required' => $this->days_until_required,
            'progress_percentage' => $this->progress_percentage,
            
            // Relationships
            'reservations' => $this->whenLoaded('reservations', function () {
                return $this->reservations->map(function ($reservation) {
                    return [
                        'id' => $reservation->id,
                        'product_id' => $reservation->product_id,
                        'product_name' => $reservation->product?->name,
                        'product_sku' => $reservation->product?->sku,
                        'batch_id' => $reservation->batch_id,
                        'batch_number' => $reservation->batch?->batch_number,
                        'quantity' => $reservation->quantity,
                        'unit_price' => (float) $reservation->unit_price,
                        'total_price' => $reservation->total_price,
                        'status' => $reservation->status,
                        'fulfilled_at' => $reservation->fulfilled_at?->toISOString(),
                    ];
                });
            }),
            
            'creator' => $this->whenLoaded('creator', [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
