<?php

namespace App\Modules\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PhysicalCountResource extends JsonResource
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
            'counted_by' => $this->counted_by,
            'system_quantity' => $this->system_quantity,
            'counted_quantity' => $this->counted_quantity,
            'variance' => $this->variance,
            'variance_percentage' => $this->variance_percentage,
            'accuracy_percentage' => $this->accuracy_percentage,
            'exceeds_threshold' => $this->exceeds_threshold,
            'threshold_used' => $this->threshold_used,
            'count_reference' => $this->count_reference,
            'count_date' => $this->count_date,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Variance analysis
            'variance_analysis' => [
                'has_variance' => $this->variance !== 0,
                'variance_type' => $this->getVarianceType(),
                'variance_severity' => $this->getVarianceSeverity(),
                'absolute_variance' => abs($this->variance),
                'absolute_variance_percentage' => abs($this->variance_percentage),
                'is_significant' => abs($this->variance_percentage) > 5, // 5% threshold
                'requires_investigation' => $this->requiresInvestigation(),
                'impact_value' => $this->getImpactValue()
            ],
            
            // Count information
            'count_info' => [
                'accuracy_level' => $this->getAccuracyLevel(),
                'time_since_count' => $this->count_date->diffForHumans(),
                'is_recent' => $this->count_date->diffInDays() <= 7,
                'formatted_date' => $this->count_date->format('M d, Y H:i')
            ],
            
            // Status indicators
            'status' => [
                'overall' => $this->getOverallStatus(),
                'requires_approval' => $this->requiresApproval(),
                'can_auto_adjust' => $this->canAutoAdjust()
            ],
            
            // Relationships
            'product' => $this->when($this->relationLoaded('product'), function() {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                    'category' => $this->product->category,
                    'unit_price' => $this->product->unit_price,
                    'quantity' => $this->product->quantity
                ];
            }),
            
            'counter' => $this->when($this->relationLoaded('counter'), function() {
                return [
                    'id' => $this->counter->id,
                    'name' => $this->counter->name,
                    'email' => $this->counter->email,
                    'role' => $this->counter->role
                ];
            }),
            
            // Recommendations
            'recommendations' => $this->getRecommendations(),
        ];
    }
    
    /**
     * Get variance type (over/under).
     */
    private function getVarianceType(): string
    {
        if ($this->variance > 0) {
            return 'overage';
        } elseif ($this->variance < 0) {
            return 'shortage';
        }
        return 'none';
    }
    
    /**
     * Get variance severity level.
     */
    private function getVarianceSeverity(): string
    {
        $absVariancePercentage = abs($this->variance_percentage);
        
        if ($absVariancePercentage >= 20) {
            return 'critical';
        } elseif ($absVariancePercentage >= 10) {
            return 'high';
        } elseif ($absVariancePercentage >= 5) {
            return 'medium';
        } elseif ($absVariancePercentage > 0) {
            return 'low';
        }
        
        return 'none';
    }
    
    /**
     * Check if variance requires investigation.
     */
    private function requiresInvestigation(): bool
    {
        // Investigation required for significant variances
        if (abs($this->variance_percentage) >= 10) {
            return true;
        }
        
        // Investigation for high-value variances
        if ($this->relationLoaded('product') && $this->product->unit_price) {
            $valueVariance = abs($this->variance) * $this->product->unit_price;
            if ($valueVariance >= 1000) { // ₱1000+ variance
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get financial impact value of variance.
     */
    private function getImpactValue(): ?float
    {
        if (!$this->relationLoaded('product') || !$this->product->unit_price) {
            return null;
        }
        
        return $this->variance * $this->product->unit_price;
    }
    
    /**
     * Get accuracy level classification.
     */
    private function getAccuracyLevel(): string
    {
        $absVariancePercentage = abs($this->variance_percentage);
        
        if ($absVariancePercentage <= 1) {
            return 'excellent';
        } elseif ($absVariancePercentage <= 2) {
            return 'good';
        } elseif ($absVariancePercentage <= 5) {
            return 'acceptable';
        } elseif ($absVariancePercentage <= 10) {
            return 'poor';
        }
        
        return 'unacceptable';
    }
    
    /**
     * Get overall status.
     */
    private function getOverallStatus(): string
    {
        if ($this->variance === 0) {
            return 'accurate';
        }
        
        if ($this->requiresInvestigation()) {
            return 'requires_investigation';
        }
        
        if (abs($this->variance_percentage) > 5) {
            return 'significant_variance';
        }
        
        return 'minor_variance';
    }
    
    /**
     * Check if count requires approval for adjustment.
     */
    private function requiresApproval(): bool
    {
        // Require approval for significant variances
        if (abs($this->variance_percentage) >= 5) {
            return true;
        }
        
        // Require approval for high-value variances
        if ($this->relationLoaded('product') && $this->product->unit_price) {
            $valueVariance = abs($this->variance) * $this->product->unit_price;
            if ($valueVariance >= 500) { // ₱500+ variance
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if variance can be auto-adjusted.
     */
    private function canAutoAdjust(): bool
    {
        // Allow auto-adjustment for small variances only
        return abs($this->variance_percentage) <= 2 && 
               (!$this->relationLoaded('product') || 
                abs($this->variance) * ($this->product->unit_price ?? 0) <= 100);
    }
    
    /**
     * Get recommendations based on variance.
     */
    private function getRecommendations(): array
    {
        $recommendations = [];
        
        if ($this->variance === 0) {
            $recommendations[] = [
                'type' => 'positive',
                'message' => 'Accurate count - no action required',
                'priority' => 'info'
            ];
            return $recommendations;
        }
        
        $severity = $this->getVarianceSeverity();
        
        switch($severity) {
            case 'critical':
                $recommendations[] = [
                    'type' => 'action',
                    'message' => 'Immediate recount required - investigate root cause',
                    'priority' => 'urgent'
                ];
                $recommendations[] = [
                    'type' => 'investigation',
                    'message' => 'Review all transactions since last count',
                    'priority' => 'high'
                ];
                break;
                
            case 'high':
                $recommendations[] = [
                    'type' => 'action',
                    'message' => 'Recount recommended to verify variance',
                    'priority' => 'high'
                ];
                $recommendations[] = [
                    'type' => 'process',
                    'message' => 'Review counting procedures and training',
                    'priority' => 'medium'
                ];
                break;
                
            case 'medium':
                $recommendations[] = [
                    'type' => 'review',
                    'message' => 'Review recent transactions for discrepancies',
                    'priority' => 'medium'
                ];
                break;
                
            case 'low':
                $recommendations[] = [
                    'type' => 'monitor',
                    'message' => 'Monitor for recurring variances in future counts',
                    'priority' => 'low'
                ];
                break;
        }
        
        // Specific recommendations based on variance type
        if ($this->getVarianceType() === 'shortage') {
            $recommendations[] = [
                'type' => 'security',
                'message' => 'Check for potential shrinkage or theft',
                'priority' => $severity === 'critical' ? 'urgent' : 'medium'
            ];
        } elseif ($this->getVarianceType() === 'overage') {
            $recommendations[] = [
                'type' => 'process',
                'message' => 'Verify all inbound transactions were recorded',
                'priority' => 'medium'
            ];
        }
        
        return $recommendations;
    }
}
