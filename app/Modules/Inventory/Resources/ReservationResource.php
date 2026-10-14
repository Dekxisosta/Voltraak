<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    /**
     * Statuses in which a reservation still holds stock.
     */
    private const LIVE_STATUSES = ['pending', 'confirmed', 'allocated'];

    public function toArray(Request $request): array
    {
        $live = in_array($this->status, self::LIVE_STATUSES, true);
        $order = $this->customerOrder;
        $orderStatus = $order?->status?->value;

        return [
            'id' => $this->id,
            'customer_order_id' => $this->customer_order_id,
            'order_number' => $order?->order_number,
            'order_status' => $orderStatus,
            'customer_name' => $order?->customer_name,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->name,
            'product_sku' => $this->product?->sku,
            'batch_id' => $this->batch_id,
            'batch_number' => $this->batch?->batch_number,
            'quantity' => (int) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'status' => $this->status,
            'is_expired' => $live && $this->isExpired(),
            // Only an allocated reservation on a confirmed order can be
            // fulfilled (FulfillmentService::fulfillOrder() enforces this).
            'can_fulfill' => $this->status === 'allocated'
                && $orderStatus === 'confirmed'
                && !$this->isExpired(),
            'can_cancel' => $live,
            'reserved_at' => $this->reserved_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'fulfilled_at' => $this->fulfilled_at?->toISOString(),
            'notes' => $this->notes,
        ];
    }
}
