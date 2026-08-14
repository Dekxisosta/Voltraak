<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockTransactionResource extends JsonResource
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
            'batch_id' => $this->batch_id,
            'user_id' => $this->user_id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'unit_cost' => $this->unit_cost,
            'total_cost' => $this->total_cost,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Transaction details
            'transaction_info' => [
                'type_label' => $this->getTypeLabel(),
                'is_inbound' => in_array($this->type, ['in', 'adjustment']) && $this->quantity > 0,
                'is_outbound' => in_array($this->type, ['out', 'adjustment']) && $this->quantity < 0,
                'absolute_quantity' => abs($this->quantity),
                'transaction_value' => $this->quantity * $this->unit_cost,
                'formatted_date' => $this->created_at->format('M d, Y H:i'),
                'time_ago' => $this->created_at->diffForHumans()
            ],
            
            // Financial impact
            'financial_impact' => [
                'total_cost' => $this->total_cost,
                'unit_cost' => $this->unit_cost,
                'value_change' => $this->quantity * $this->unit_cost,
                'is_positive_impact' => ($this->quantity * $this->unit_cost) > 0
            ],
            
            // Reference information
            'reference_info' => $this->when($this->reference_type && $this->reference_id, [
                'type' => $this->reference_type,
                'id' => $this->reference_id,
                'display_reference' => $this->getDisplayReference()
            ]),
            
            // Relationships
            'product' => $this->when($this->relationLoaded('product'), function() {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                    'category' => $this->product->category,
                    'unit' => $this->product->unit
                ];
            }),
            
            'batch' => $this->when($this->relationLoaded('batch'), function() {
                return [
                    'id' => $this->batch->id,
                    'batch_code' => $this->batch->batch_code,
                    'expiry_date' => $this->batch->expiry_date,
                    'status' => $this->batch->status,
                    'current_quantity' => $this->batch->current_quantity
                ];
            }),
            
            'user' => $this->when($this->relationLoaded('user'), function() {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'role' => $this->user->role
                ];
            }),
            
            // Context information for different transaction types
            'context' => $this->getTransactionContext(),
            
            // Validation flags
            'flags' => [
                'has_reference' => !is_null($this->reference_type) && !is_null($this->reference_id),
                'has_batch' => !is_null($this->batch_id),
                'has_notes' => !is_null($this->notes) && strlen($this->notes) > 0,
                'is_adjustment' => $this->type === 'adjustment',
                'is_recent' => $this->created_at->diffInHours() <= 24
            ]
        ];
    }
    
    /**
     * Get human-readable type label.
     */
    private function getTypeLabel(): string
    {
        return match($this->type) {
            'in' => 'Stock In',
            'out' => 'Stock Out', 
            'adjustment' => $this->quantity > 0 ? 'Adjustment (Increase)' : 'Adjustment (Decrease)',
            'transfer' => 'Transfer',
            'damaged' => 'Damaged Stock',
            'expired' => 'Expired Stock',
            'returned' => 'Customer Return',
            default => ucfirst($this->type)
        };
    }
    
    /**
     * Get display reference for UI.
     */
    private function getDisplayReference(): string
    {
        if (!$this->reference_type || !$this->reference_id) {
            return '';
        }
        
        return match($this->reference_type) {
            'purchase_order' => "PO #{$this->reference_id}",
            'customer_order' => "Order #{$this->reference_id}",
            'physical_count' => "Count #{$this->reference_id}",
            'damage_report' => "Damage #{$this->reference_id}",
            'transfer' => "Transfer #{$this->reference_id}",
            'return' => "Return #{$this->reference_id}",
            default => ucfirst($this->reference_type) . " #{$this->reference_id}"
        };
    }
    
    /**
     * Get transaction context based on type and reference.
     */
    private function getTransactionContext(): array
    {
        $context = [
            'category' => $this->getTransactionCategory(),
            'priority' => $this->getTransactionPriority(),
            'requires_approval' => $this->requiresApproval(),
            'is_reversible' => $this->isReversible()
        ];
        
        // Add type-specific context
        switch($this->type) {
            case 'adjustment':
                $context['adjustment_reason'] = $this->getAdjustmentReason();
                break;
                
            case 'out':
                $context['depletion_impact'] = $this->getDepletionImpact();
                break;
                
            case 'in':
                $context['replenishment_impact'] = $this->getReplenishmentImpact();
                break;
        }
        
        return $context;
    }
    
    /**
     * Get transaction category for grouping.
     */
    private function getTransactionCategory(): string
    {
        return match($this->type) {
            'in' => 'replenishment',
            'out' => 'consumption',
            'adjustment' => 'correction',
            'transfer' => 'movement',
            'damaged', 'expired' => 'loss',
            'returned' => 'recovery',
            default => 'other'
        };
    }
    
    /**
     * Get transaction priority level.
     */
    private function getTransactionPriority(): string
    {
        if ($this->type === 'adjustment' && abs($this->quantity) > 100) {
            return 'high';
        }
        
        if (in_array($this->type, ['damaged', 'expired']) && $this->quantity > 50) {
            return 'high';
        }
        
        if ($this->type === 'out' && $this->relationLoaded('batch')) {
            $batch = $this->batch;
            if ($batch && $batch->expiry_date && $batch->expiry_date->diffInDays() <= 7) {
                return 'high'; // Using expiring batch
            }
        }
        
        return 'normal';
    }
    
    /**
     * Check if transaction requires approval.
     */
    private function requiresApproval(): bool
    {
        // Large adjustments require approval
        if ($this->type === 'adjustment' && abs($this->quantity) > 100) {
            return true;
        }
        
        // High-value transactions require approval
        if (abs($this->total_cost) > 10000) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if transaction is reversible.
     */
    private function isReversible(): bool
    {
        // Generally, transactions are reversible within 24 hours
        if ($this->created_at->diffInHours() > 24) {
            return false;
        }
        
        // Some transaction types are not easily reversible
        if (in_array($this->type, ['expired', 'damaged'])) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get adjustment reason context.
     */
    private function getAdjustmentReason(): string
    {
        if ($this->reference_type === 'physical_count') {
            return 'Physical count variance correction';
        }
        
        if ($this->reference_type === 'damage_report') {
            return 'Damage report adjustment';
        }
        
        if (stripos($this->notes, 'correction') !== false) {
            return 'Manual correction';
        }
        
        return 'General adjustment';
    }
    
    /**
     * Get depletion impact for stock out transactions.
     */
    private function getDepletionImpact(): array
    {
        $impact = ['level' => 'normal'];
        
        if ($this->relationLoaded('product')) {
            $product = $this->product;
            $remainingStock = $product->current_quantity;
            
            if ($remainingStock <= 0) {
                $impact['level'] = 'critical';
                $impact['message'] = 'Product is now out of stock';
            } elseif ($product->reorder_point > 0 && $remainingStock <= $product->reorder_point) {
                $impact['level'] = 'warning';
                $impact['message'] = 'Product is below reorder point';
            }
        }
        
        return $impact;
    }
    
    /**
     * Get replenishment impact for stock in transactions.
     */
    private function getReplenishmentImpact(): array
    {
        $impact = ['level' => 'positive'];
        
        if ($this->relationLoaded('product')) {
            $product = $this->product;
            
            if ($product->reorder_point > 0 && $product->current_quantity > $product->reorder_point) {
                $impact['message'] = 'Product is now above reorder point';
            } else {
                $impact['message'] = 'Stock level increased';
            }
        }
        
        return $impact;
    }
}