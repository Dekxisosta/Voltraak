<?php

namespace App\Modules\Procurement\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'contact_person',
        'email',
        'phone',
        'address',
        'payment_terms',
        'lead_time_days',
        'minimum_order_value',
        'is_active'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'minimum_order_value' => 'decimal:2',
        'is_active' => 'boolean',
        'lead_time_days' => 'integer'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the purchase orders for this supplier.
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    /**
     * Get the procurement requests for this supplier.
     */
    public function procurementRequests(): HasMany
    {
        return $this->hasMany(ProcurementRequest::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to get active suppliers only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get suppliers by minimum order value range.
     */
    public function scopeByMinOrderValue($query, $min = null, $max = null)
    {
        if ($min !== null) {
            $query->where('minimum_order_value', '>=', $min);
        }
        
        if ($max !== null) {
            $query->where('minimum_order_value', '<=', $max);
        }
        
        return $query;
    }

    /**
     * Scope to get suppliers by lead time.
     */
    public function scopeByLeadTime($query, $maxDays)
    {
        return $query->where('lead_time_days', '<=', $maxDays);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the supplier's performance rating (calculated field).
     */
    public function getPerformanceRatingAttribute(): ?float
    {
        // This would be calculated based on order history, delivery times, etc.
        // For now, return null - to be implemented with actual performance tracking
        return null;
    }

    /**
     * Get the supplier's total order value.
     */
    public function getTotalOrderValueAttribute(): float
    {
        return $this->purchaseOrders()
            ->where('status', 'completed')
            ->sum('total_amount') ?? 0.0;
    }

    /**
     * Get the supplier's average order value.
     */
    public function getAverageOrderValueAttribute(): float
    {
        $completedOrders = $this->purchaseOrders()
            ->where('status', 'completed');
            
        $count = $completedOrders->count();
        
        return $count > 0 ? $completedOrders->sum('total_amount') / $count : 0.0;
    }

    /**
     * Get the supplier's last order date.
     */
    public function getLastOrderDateAttribute(): ?string
    {
        $lastOrder = $this->purchaseOrders()
            ->latest('created_at')
            ->first();
            
        return $lastOrder?->created_at?->toDateString();
    }

    /**
     * Check if supplier meets minimum order value.
     */
    public function meetsMinimumOrder(float $orderValue): bool
    {
        return $this->minimum_order_value <= $orderValue;
    }

    /*
    |--------------------------------------------------------------------------
    | Business Logic Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get supplier reliability metrics.
     */
    public function getReliabilityMetrics(): array
    {
        $totalOrders = $this->purchaseOrders()->count();
        $completedOrders = $this->purchaseOrders()->where('status', 'completed')->count();
        $onTimeDeliveries = $this->purchaseOrders()
            ->where('status', 'completed')
            ->whereRaw('delivered_at <= expected_delivery_date')
            ->count();

        return [
            'total_orders' => $totalOrders,
            'completion_rate' => $totalOrders > 0 ? ($completedOrders / $totalOrders) * 100 : 0,
            'on_time_delivery_rate' => $completedOrders > 0 ? ($onTimeDeliveries / $completedOrders) * 100 : 0,
            'average_lead_time' => $this->lead_time_days,
            'total_order_value' => $this->total_order_value
        ];
    }

    /**
     * Check if supplier is preferred based on performance.
     */
    public function isPreferred(): bool
    {
        $metrics = $this->getReliabilityMetrics();
        
        // Supplier is preferred if:
        // - Completion rate > 95%
        // - On-time delivery rate > 90%
        // - Has at least 5 completed orders
        return $metrics['completion_rate'] > 95 && 
               $metrics['on_time_delivery_rate'] > 90 && 
               $this->purchaseOrders()->where('status', 'completed')->count() >= 5;
    }

    /**
     * Get expected delivery date for a new order.
     */
    public function getExpectedDeliveryDate(\Carbon\Carbon $orderDate = null): \Carbon\Carbon
    {
        $orderDate = $orderDate ?? now();
        return $orderDate->addDays($this->lead_time_days);
    }

    /**
     * Calculate optimal order quantity considering minimum order value.
     */
    public function calculateOptimalOrderQuantity(float $unitCost, int $requiredQuantity): array
    {
        $orderValue = $unitCost * $requiredQuantity;
        
        if ($orderValue >= $this->minimum_order_value) {
            return [
                'quantity' => $requiredQuantity,
                'value' => $orderValue,
                'meets_minimum' => true,
                'additional_quantity_needed' => 0
            ];
        }
        
        // Calculate additional quantity needed to meet minimum
        $additionalValueNeeded = $this->minimum_order_value - $orderValue;
        $additionalQuantity = ceil($additionalValueNeeded / $unitCost);
        
        return [
            'quantity' => $requiredQuantity + $additionalQuantity,
            'value' => $this->minimum_order_value,
            'meets_minimum' => true,
            'additional_quantity_needed' => $additionalQuantity,
            'original_quantity' => $requiredQuantity,
            'minimum_order_value' => $this->minimum_order_value
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get suppliers that can fulfill an order by value and lead time.
     */
    public static function getQualifiedSuppliers(float $orderValue, int $maxLeadTimeDays = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = static::active()
            ->where('minimum_order_value', '<=', $orderValue);
            
        if ($maxLeadTimeDays !== null) {
            $query->where('lead_time_days', '<=', $maxLeadTimeDays);
        }
        
        return $query->orderBy('lead_time_days')
                    ->orderBy('minimum_order_value')
                    ->get();
    }

    /**
     * Get preferred suppliers (high performance).
     */
    public static function getPreferredSuppliers(): \Illuminate\Database\Eloquent\Collection
    {
        return static::active()
            ->get()
            ->filter(function ($supplier) {
                return $supplier->isPreferred();
            });
    }
}