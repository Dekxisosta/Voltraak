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
            'batch_id' => $this->batch_id,
            'user_id' => $this->user_id,
            'expected_quantity' => $this->expected_quantity,
            'actual_quantity' => $this->actual_quantity,
            'variance' => $this->variance,
            'variance_percentage' => $this->variance_percentage,
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
                'count_method' => $this->getCountMethod(),
                'accuracy_level' => $this->getAccuracyLevel(),
                'time_since_count' => $this->count_date->diffForHumans(),
                'is_recent' => $this->count_date->diffInDays() <= 7,
                'formatted_date' => $this->count_date->format('M d, Y H:i')
            ],
            
            // Status indicators
            'status' => [
                'overall' => $this->getOverallStatus(),
                'requires_approval' => $this->requiresApproval(),
                'is_approved' => $this->isApproved(),
                'can_auto_adjust' => $this->canAutoAdjust()
            ],
            
            // Relationships
            'product' => $this->when($this->relationLoaded('product'), function() {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                    'category' => $this->product->category,
                    'unit' => $this->product->unit,
                    'unit_cost' => $this->product->unit_cost,
                    'current_quantity' => $this->product->current_quantity
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
            
            // Recommendations
            'recommendations' => $this->getRecommendations(),
            
            // Historical context when available
            'historical_context' => $this->when($this->relationLoaded('product'), function() {
                return $this->getHistoricalContext();
            })
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
        if ($this->relationLoaded('product') && $this->product->unit_cost) {
            $valueVariance = abs($this->variance) * $this->product->unit_cost;
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
        if (!$this->relationLoaded('product') || !$this->product->unit_cost) {
            return null;
        }
        
        return $this->variance * $this->product->unit_cost;
    }
    
    /**
     * Get count method (inferred from context).
     */
    private function getCountMethod(): string
    {
        // This could be enhanced to track actual counting methods
        if ($this->batch_id) {
            return 'batch_specific';
        }
        return 'general_count';
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
        if ($this->relationLoaded('product') && $this->product->unit_cost) {
            $valueVariance = abs($this->variance) * $this->product->unit_cost;
            if ($valueVariance >= 500) { // ₱500+ variance
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if count has been approved (placeholder - would need approval tracking).
     */
    private function isApproved(): bool
    {
        // This would need an approval system implementation
        // For now, assume small variances are auto-approved
        return abs($this->variance_percentage) < 2;
    }
    
    /**
     * Check if variance can be auto-adjusted.
     */
    private function canAutoAdjust(): bool
    {
        // Allow auto-adjustment for small variances only
        return abs($this->variance_percentage) <= 2 && 
               (!$this->relationLoaded('product') || 
                abs($this->variance) * ($this->product->unit_cost ?? 0) <= 100);
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
    
    /**
     * Get historical context for this product's counting accuracy.
     */
    private function getHistoricalContext(): array
    {
        // This would ideally query recent counts for the same product
        // For now, return placeholder structure
        return [
            'recent_counts' => 0, // Would be calculated from database
            'average_variance' => 0, // Would be calculated
            'variance_trend' => 'stable', // improving, degrading, stable
            'last_accurate_count' => null // Date of last 100% accurate count
        ];
    }
}