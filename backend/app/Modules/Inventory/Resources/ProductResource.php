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
            'unit_price' => $this->unit_price,
            'reorder_level' => $this->reorder_level,
            'max_stock_level' => $this->max_stock_level,
            'quantity' => $this->quantity,
            'available_quantity' => $this->available_quantity,
            'is_seasonal' => $this->is_seasonal,
            'shelf_life_days' => $this->shelf_life_days,
            'storage_bin' => $this->storage_bin,
            'barcode' => $this->barcode,
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
            'total_value' => $this->quantity * $this->unit_price,
            
            // Conditional relationships
            'batches' => BatchResource::collection($this->whenLoaded('batches')),
            'stock_transactions' => StockTransactionResource::collection($this->whenLoaded('stockTransactions')),
            
            // Batch summary when batches are loaded
            'batch_summary' => $this->when($this->relationLoaded('batches'), function() {
                $batches = $this->batches;
                return [
                    'total_batches' => $batches->count(),
                    'available_batches' => $batches->where('status', 'safe')->count(),
                    'expiring_soon' => $batches->where('status', 'warning')->count(),
                    'expired_batches' => $batches->where('status', 'expired')->count(),
                    'earliest_expiry' => $batches->where('quantity', '>', 0)->min('expiry_date'),
                    'latest_expiry' => $batches->where('quantity', '>', 0)->max('expiry_date')
                ];
            }),
            
            // FEFO information when batches are loaded
            'fefo_info' => $this->when($this->relationLoaded('batches'), function() {
                $availableBatches = $this->batches
                    ->where('quantity', '>', 0)
                    ->sortBy('expiry_date');
                
                return [
                    'next_to_expire' => $availableBatches->first() ? [
                        'batch_id' => $availableBatches->first()->id,
                        'batch_number' => $availableBatches->first()->batch_number,
                        'expiry_date' => $availableBatches->first()->expiry_date,
                        'days_to_expire' => $availableBatches->first()->expiry_date ? 
                            now()->diffInDays($availableBatches->first()->expiry_date, false) : null,
                        'quantity' => $availableBatches->first()->quantity
                    ] : null,
                    'picking_order' => $availableBatches->take(5)->map(function($batch) {
                        return [
                            'batch_id' => $batch->id,
                            'batch_number' => $batch->batch_number,
                            'expiry_date' => $batch->expiry_date,
                            'quantity' => $batch->quantity,
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
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }
        
        if ($this->reorder_level > 0 && $this->quantity <= $this->reorder_level) {
            return 'low_stock';
        }
        
        return 'in_stock';
    }
    
    /**
     * Check if product is low stock.
     */
    private function isLowStock(): bool
    {
        return $this->reorder_level > 0 && 
               $this->quantity > 0 && 
               $this->quantity <= $this->reorder_level;
    }
    
    /**
     * Check if product is out of stock.
     */
    private function isOutOfStock(): bool
    {
        return $this->quantity <= 0;
    }
    
    /**
     * Check if product requires reorder.
     */
    private function requiresReorder(): bool
    {
        return $this->reorder_level > 0 && $this->quantity <= $this->reorder_level;
    }
}
