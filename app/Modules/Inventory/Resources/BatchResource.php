<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BatchResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'batch_number' => $this->batch_number,
            'manufacture_date' => $this->manufacture_date,
            'expiry_date' => $this->expiry_date,
            'received_quantity' => $this->received_quantity,
            'quantity' => $this->quantity,
            'available_quantity' => $this->available_quantity,
            'unit_cost' => $this->unit_cost,
            'status' => $this->status,
            'supplier_batch_number' => $this->supplier_batch_number,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Expiry information
            'expiry_info' => [
                'days_to_expire' => $this->expiry_date ? 
                    now()->diffInDays($this->expiry_date, false) : null,
                'is_expired' => $this->expiry_date ? $this->expiry_date->isPast() : false,
                'is_expiring_soon' => $this->expiry_date ? 
                    $this->expiry_date->diffInDays(now()) <= 60 : false,
                'expiry_status' => $this->getExpiryStatus(),
                'shelf_life_remaining' => $this->getShelfLifeRemaining()
            ],
            
            // Quantity information
            'quantity_info' => [
                'utilization_rate' => $this->received_quantity > 0 ? 
                    (($this->received_quantity - $this->quantity) / $this->received_quantity) * 100 : 0,
                'is_fully_utilized' => $this->quantity <= 0,
                'has_reservations' => $this->reservations()->exists(),
            ],
            
            // Financial information
            'financial_info' => [
                'total_value' => $this->quantity * $this->unit_cost,
                'available_value' => $this->available_quantity * $this->unit_cost
            ],
            
            // FEFO priority
            'fefo_priority' => $this->getFEFOPriority(),
            
            // Relationships
            'product' => new ProductResource($this->whenLoaded('product')),
            'stock_transactions' => StockTransactionResource::collection($this->whenLoaded('stockTransactions')),
            
            // Transaction summary when stock transactions are loaded
            'transaction_summary' => $this->when($this->relationLoaded('stockTransactions'), function() {
                $transactions = $this->stockTransactions;
                return [
                    'total_transactions' => $transactions->count(),
                    'stock_in_count' => $transactions->where('type', 'in')->count(),
                    'stock_out_count' => $transactions->where('type', 'out')->count(),
                    'adjustment_count' => $transactions->where('type', 'adjustment')->count(),
                    'total_in' => $transactions->where('type', 'in')->sum('quantity'),
                    'total_out' => $transactions->where('type', 'out')->sum('quantity'),
                    'last_transaction' => $transactions->first() ? [
                        'type' => $transactions->first()->type,
                        'quantity' => $transactions->first()->quantity,
                        'date' => $transactions->first()->created_at,
                        'user' => $transactions->first()->user?->name
                    ] : null
                ];
            }),
        ];
    }
    
    /**
     * Get expiry status.
     */
    private function getExpiryStatus(): string
    {
        if (!$this->expiry_date) {
            return 'no_expiry';
        }
        
        if ($this->expiry_date->isPast()) {
            return 'expired';
        }
        
        $daysToExpire = now()->diffInDays($this->expiry_date, false);
        
        if ($daysToExpire <= 30) {
            return 'critical';
        } elseif ($daysToExpire <= 60) {
            return 'warning';
        }
        
        return 'safe';
    }
    
    /**
     * Get remaining shelf life percentage.
     */
    private function getShelfLifeRemaining(): ?float
    {
        if (!$this->manufacture_date || !$this->expiry_date) {
            return null;
        }
        
        $totalShelfLife = $this->manufacture_date->diffInDays($this->expiry_date);
        $remainingLife = now()->diffInDays($this->expiry_date, false);
        
        if ($totalShelfLife <= 0) {
            return 0;
        }
        
        return max(0, ($remainingLife / $totalShelfLife) * 100);
    }
    
    /**
     * Get FEFO priority score (lower is higher priority).
     */
    private function getFEFOPriority(): array
    {
        $priority = [
            'score' => 0,
            'level' => 'normal',
            'reason' => 'Normal priority'
        ];
        
        if (!$this->expiry_date || $this->quantity <= 0) {
            $priority['score'] = 999;
            $priority['level'] = 'unavailable';
            $priority['reason'] = 'Not available for picking';
            return $priority;
        }
        
        $daysToExpire = now()->diffInDays($this->expiry_date, false);
        
        if ($daysToExpire < 0) {
            $priority['score'] = 1000; // Expired - should not be picked
            $priority['level'] = 'expired';
            $priority['reason'] = 'Batch is expired';
        } elseif ($daysToExpire <= 7) {
            $priority['score'] = 10 - $daysToExpire; // Higher urgency for sooner expiry
            $priority['level'] = 'critical';
            $priority['reason'] = 'Expires within 7 days';
        } elseif ($daysToExpire <= 30) {
            $priority['score'] = 20 - ($daysToExpire - 7); // Medium urgency
            $priority['level'] = 'high';
            $priority['reason'] = 'Expires within 30 days';
        } elseif ($daysToExpire <= 60) {
            $priority['score'] = 50 - ($daysToExpire - 30); // Lower urgency
            $priority['level'] = 'medium';
            $priority['reason'] = 'Expires within 60 days';
        } else {
            $priority['score'] = 100; // Normal priority
            $priority['level'] = 'normal';
            $priority['reason'] = 'Good shelf life remaining';
        }
        
        return $priority;
    }
}
