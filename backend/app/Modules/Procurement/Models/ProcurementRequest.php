<?php

namespace App\Modules\Procurement\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Support\Enums\OrderStatus;

class ProcurementRequest extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'product_id',
        'supplier_id',
        'purchase_order_id',
        'user_id',
        'requested_quantity',
        'urgency_level',
        'justification',
        'estimated_cost',
        'status',
        'approved_by',
        'approved_at',
        'notes'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'status' => OrderStatus::class,
        'requested_quantity' => 'integer',
        'urgency_level' => 'integer',
        'estimated_cost' => 'decimal:2',
        'approved_at' => 'datetime'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the product for this procurement request.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Inventory\Models\Product::class);
    }

    /**
     * Get the supplier for this procurement request.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the purchase order generated from this request.
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Get the user who created this request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    /**
     * Get the user who approved this request.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to get requests by status.
     */
    public function scopeByStatus($query, OrderStatus $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', OrderStatus::PENDING);
    }

    /**
     * Scope to get approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', OrderStatus::APPROVED);
    }

    /**
     * Scope to get urgent requests.
     */
    public function scopeUrgent($query, int $urgencyThreshold = 3)
    {
        return $query->where('urgency_level', '>=', $urgencyThreshold);
    }

    /**
     * Scope to get requests by product.
     */
    public function scopeByProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope to get requests by supplier.
     */
    public function scopeBySupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    /**
     * Scope to get requests within date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the urgency level label.
     */
    public function getUrgencyLabelAttribute(): string
    {
        return match($this->urgency_level) {
            1 => 'Low',
            2 => 'Normal',
            3 => 'High',
            4 => 'Critical',
            5 => 'Emergency',
            default => 'Unknown'
        };
    }

    /**
     * Get the total estimated cost.
     */
    public function getTotalEstimatedCostAttribute(): float
    {
        return $this->requested_quantity * $this->estimated_cost;
    }

    /**
     * Check if request is overdue for approval.
     */
    public function getIsOverdueAttribute(): bool
    {
        if ($this->status !== OrderStatus::PENDING) {
            return false;
        }
        
        // Calculate overdue based on urgency level
        $maxDays = match($this->urgency_level) {
            5 => 0.5, // Emergency: 12 hours
            4 => 1,   // Critical: 1 day
            3 => 2,   // High: 2 days
            2 => 5,   // Normal: 5 days
            1 => 10,  // Low: 10 days
            default => 7
        };
        
        return $this->created_at->addDays($maxDays)->isPast();
    }

    /**
     * Get time remaining for approval based on urgency.
     */
    public function getTimeRemainingAttribute(): ?string
    {
        if ($this->status !== OrderStatus::PENDING) {
            return null;
        }
        
        $maxDays = match($this->urgency_level) {
            5 => 0.5, // Emergency: 12 hours
            4 => 1,   // Critical: 1 day
            3 => 2,   // High: 2 days
            2 => 5,   // Normal: 5 days
            1 => 10,  // Low: 10 days
            default => 7
        };
        
        $deadline = $this->created_at->addDays($maxDays);
        
        if ($deadline->isPast()) {
            return 'Overdue by ' . $deadline->diffForHumans(now(), true);
        }
        
        return $deadline->diffForHumans(now(), true) . ' remaining';
    }

    /*
    |--------------------------------------------------------------------------
    | Status Management
    |--------------------------------------------------------------------------
    */

    /**
     * Check if the request can be approved.
     */
    public function canBeApproved(): bool
    {
        return $this->status === OrderStatus::PENDING && 
               $this->product && 
               $this->supplier && 
               $this->requested_quantity > 0;
    }

    /**
     * Check if the request can be rejected.
     */
    public function canBeRejected(): bool
    {
        return $this->status === OrderStatus::PENDING;
    }

    /**
     * Check if the request can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [OrderStatus::PENDING, OrderStatus::APPROVED]) && 
               !$this->purchase_order_id;
    }

    /**
     * Approve the procurement request.
     */
    public function approve(\App\Models\User $approver): bool
    {
        if (!$this->canBeApproved()) {
            return false;
        }
        
        $this->status = OrderStatus::APPROVED;
        $this->approved_by = $approver->id;
        $this->approved_at = now();
        
        return $this->save();
    }

    /**
     * Reject the procurement request.
     */
    public function reject(\App\Models\User $approver, string $reason = null): bool
    {
        if (!$this->canBeRejected()) {
            return false;
        }
        
        $this->status = OrderStatus::REJECTED;
        $this->approved_by = $approver->id;
        $this->approved_at = now();
        
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n\n" : '') . "Rejected: " . $reason;
        }
        
        return $this->save();
    }

    /**
     * Cancel the procurement request.
     */
    public function cancel(string $reason = null): bool
    {
        if (!$this->canBeCancelled()) {
            return false;
        }
        
        $this->status = OrderStatus::CANCELLED;
        
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n\n" : '') . "Cancelled: " . $reason;
        }
        
        return $this->save();
    }

    /*
    |--------------------------------------------------------------------------
    | Business Logic Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Calculate reorder point based priority score.
     */
    public function getReorderPriorityScore(): float
    {
        if (!$this->product) {
            return 0;
        }
        
        $currentStock = $this->product->current_quantity;
        $reorderPoint = $this->product->reorder_point;
        
        // Base score from stock level (lower stock = higher priority)
        $stockScore = $reorderPoint > 0 ? max(0, ($reorderPoint - $currentStock) / $reorderPoint) : 0;
        
        // Urgency multiplier
        $urgencyMultiplier = $this->urgency_level / 5;
        
        // Time factor (older requests get higher priority)
        $daysSinceCreated = $this->created_at->diffInDays(now());
        $timeFactor = min(1, $daysSinceCreated / 7); // Max factor at 1 week
        
        return ($stockScore * 0.5 + $urgencyMultiplier * 0.3 + $timeFactor * 0.2) * 100;
    }

    /**
     * Check if request justification is adequate.
     */
    public function hasAdequateJustification(): bool
    {
        if ($this->urgency_level >= 4) { // Critical or Emergency
            return !empty($this->justification) && strlen($this->justification) >= 50;
        }
        
        return !empty($this->justification) && strlen($this->justification) >= 20;
    }

    /**
     * Validate cost estimate against product unit cost.
     */
    public function validateCostEstimate(): array
    {
        $issues = [];
        
        if (!$this->product || !$this->product->unit_cost) {
            return $issues;
        }
        
        $variance = abs($this->estimated_cost - $this->product->unit_cost);
        $variancePercent = ($variance / $this->product->unit_cost) * 100;
        
        if ($variancePercent > 25) {
            $issues[] = "Cost estimate varies significantly from product unit cost ({$variancePercent}%)";
        }
        
        if ($this->estimated_cost > $this->product->unit_cost * 1.5) {
            $issues[] = "Estimated cost is 50% higher than current product cost";
        }
        
        return $issues;
    }

    /**
     * Get request analysis data.
     */
    public function getAnalysis(): array
    {
        $analysis = [
            'priority_score' => $this->getReorderPriorityScore(),
            'urgency_label' => $this->urgency_label,
            'total_estimated_cost' => $this->total_estimated_cost,
            'is_overdue' => $this->is_overdue,
            'time_remaining' => $this->time_remaining,
            'has_adequate_justification' => $this->hasAdequateJustification()
        ];
        
        if ($this->product) {
            $analysis['product_analysis'] = [
                'current_stock' => $this->product->current_quantity,
                'reorder_point' => $this->product->reorder_point,
                'stock_level' => $this->product->current_quantity <= $this->product->reorder_point ? 'below_reorder' : 'above_reorder',
                'is_out_of_stock' => $this->product->current_quantity <= 0
            ];
            
            $analysis['cost_validation'] = $this->validateCostEstimate();
        }
        
        return $analysis;
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get requests requiring immediate attention.
     */
    public static function getRequiringAttention(): \Illuminate\Database\Eloquent\Collection
    {
        return static::pending()
            ->with(['product', 'supplier', 'user'])
            ->get()
            ->filter(function ($request) {
                return $request->urgency_level >= 3 || $request->is_overdue;
            })
            ->sortByDesc('priority_score');
    }

    /**
     * Generate procurement requests for products below reorder point.
     */
    public static function generateForLowStockProducts(\App\Models\User $requestor): \Illuminate\Database\Eloquent\Collection
    {
        $lowStockProducts = \App\Modules\Inventory\Models\Product::lowStock()
            ->where('is_active', true)
            ->where('reorder_point', '>', 0)
            ->get();
        
        $requests = collect();
        
        foreach ($lowStockProducts as $product) {
            // Skip if there's already a pending request for this product
            if (static::where('product_id', $product->id)->pending()->exists()) {
                continue;
            }
            
            // Calculate recommended quantity (2x reorder point - current stock)
            $recommendedQuantity = max(1, ($product->reorder_point * 2) - $product->current_quantity);
            
            // Determine urgency based on current stock level
            $urgencyLevel = $product->current_quantity <= 0 ? 5 : // Emergency if out of stock
                           ($product->current_quantity < $product->reorder_point * 0.5 ? 4 : 3); // Critical if very low
            
            $request = static::create([
                'product_id' => $product->id,
                'user_id' => $requestor->id,
                'requested_quantity' => $recommendedQuantity,
                'urgency_level' => $urgencyLevel,
                'justification' => "Auto-generated: Product stock ({$product->current_quantity}) is below reorder point ({$product->reorder_point})",
                'estimated_cost' => $product->unit_cost ?? 0,
                'status' => OrderStatus::PENDING
            ]);
            
            $requests->push($request);
        }
        
        return $requests;
    }

    /**
     * Get procurement summary for a period.
     */
    public static function getSummaryForPeriod(\Carbon\Carbon $startDate, \Carbon\Carbon $endDate): array
    {
        $requests = static::betweenDates($startDate, $endDate);
        
        return [
            'total_requests' => $requests->count(),
            'pending_requests' => $requests->pending()->count(),
            'approved_requests' => $requests->approved()->count(),
            'rejected_requests' => $requests->byStatus(OrderStatus::REJECTED)->count(),
            'cancelled_requests' => $requests->byStatus(OrderStatus::CANCELLED)->count(),
            'urgent_requests' => $requests->urgent(3)->count(),
            'total_estimated_value' => $requests->sum(\DB::raw('requested_quantity * estimated_cost')),
            'average_approval_time' => $requests->approved()
                ->whereNotNull('approved_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, approved_at)) as avg_hours')
                ->value('avg_hours')
        ];
    }
}