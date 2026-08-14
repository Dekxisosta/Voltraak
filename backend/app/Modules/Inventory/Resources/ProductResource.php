<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'name' => $this->name,
            'sku' => $this->sku,
            'description' => $this->description,
            'category' => $this->category,
            'unit' => $this->unit,
            'unit_cost' => $this->unit_cost,
            'selling_price' => $this->selling_price,
            'reorder_point' => $this->reorder_point,
            'current_quantity' => $this->current_quantity,
            'reserved_quantity' => $this->reserved_quantity,
            'available_quantity' => $this->available_quantity,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Stock status indicators
            'stock_status' => [
                'level' => $this->getStockLevel(),
                'is_low_stock' => $this->isLowStock(),
                'is_out_of_stock' => $this->isOutOfStock(),
                'requires_reorder' => $this->requiresReorder()
            ],
            
            // Calculated fields
            'total_value' => $this->current_quantity * $this->unit_cost,
            'profit_margin' => $this->unit_cost > 0 ? 
                (($this->selling_price - $this->unit_cost) / $this->unit_cost) * 100 : 0,
            
            // Conditional relationships
            'batches' => BatchResource::collection($this->whenLoaded('batches')),
            'stock_transactions' => StockTransactionResource::collection($this->whenLoaded('stockTransactions')),
            
            // Batch summary when batches are loaded
            'batch_summary' => $this->when($this->relationLoaded('batches'), function() {
                $batches = $this->batches;
                return [
                    'total_batches' => $batches->count(),
                    'available_batches' => $batches->where('status', 'available')->count(),
                    'expiring_soon' => $batches->where('status', 'warning')->count(),
                    'expired_batches' => $batches->where('status', 'expired')->count(),
                    'earliest_expiry' => $batches->where('current_quantity', '>', 0)->min('expiry_date'),
                    'latest_expiry' => $batches->where('current_quantity', '>', 0)->max('expiry_date')
                ];
            }),
            
            // FEFO information when batches are loaded
            'fefo_info' => $this->when($this->relationLoaded('batches'), function() {
                $availableBatches = $this->batches
                    ->where('current_quantity', '>', 0)
                    ->sortBy('expiry_date');
                
                return [
                    'next_to_expire' => $availableBatches->first() ? [
                        'batch_id' => $availableBatches->first()->id,
                        'batch_code' => $availableBatches->first()->batch_code,
                        'expiry_date' => $availableBatches->first()->expiry_date,
                        'days_to_expire' => $availableBatches->first()->expiry_date ? 
                            now()->diffInDays($availableBatches->first()->expiry_date, false) : null,
                        'quantity' => $availableBatches->first()->current_quantity
                    ] : null,
                    'picking_order' => $availableBatches->take(5)->map(function($batch) {
                        return [
                            'batch_id' => $batch->id,
                            'batch_code' => $batch->batch_code,
                            'expiry_date' => $batch->expiry_date,
                            'quantity' => $batch->current_quantity,
                            'priority' => $batch->status === 'warning' ? 'high' : 'normal'
                        ];
                    })->values()
                ];
            })
        ];
    }
    
    /**
     * Get stock level indicator.
     */
    private function getStockLevel(): string
    {
        if ($this->current_quantity <= 0) {
            return 'out_of_stock';
        }
        
        if ($this->reorder_point > 0 && $this->current_quantity <= $this->reorder_point) {
            return 'low_stock';
        }
        
        return 'in_stock';
    }
    
    /**
     * Check if product is low stock.
     */
    private function isLowStock(): bool
    {
        return $this->reorder_point > 0 && 
               $this->current_quantity > 0 && 
               $this->current_quantity <= $this->reorder_point;
    }
    
    /**
     * Check if product is out of stock.
     */
    private function isOutOfStock(): bool
    {
        return $this->current_quantity <= 0;
    }
    
    /**
     * Check if product requires reorder.
     */
    private function requiresReorder(): bool
    {
        return $this->reorder_point > 0 && $this->current_quantity <= $this->reorder_point;
    }
}