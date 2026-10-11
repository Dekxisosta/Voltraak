<?php

namespace App\Modules\Procurement\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\Enums\PurchaseOrderStatus;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'code',
        'contact_person',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'default_lead_time_days',
        'credit_limit',
        'payment_terms',
        'is_active',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'credit_limit' => 'decimal:2',
        'is_active' => 'boolean',
        'default_lead_time_days' => 'integer',
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
     *
     * Note: procurement_requests are auto-generated reorder suggestions and
     * do not carry a direct supplier_id - suppliers are matched at
     * conversion time (see ProcurementService::convertRequestToPurchaseOrder).
     * This relation intentionally does not exist; use purchaseOrders() for
     * supplier-side order history instead.
     */

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
     * Scope to get suppliers by lead time.
     */
    public function scopeByLeadTime($query, $maxDays)
    {
        return $query->where('default_lead_time_days', '<=', $maxDays);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the supplier's total order value.
     */
    public function getTotalOrderValueAttribute(): float
    {
        return $this->purchaseOrders()
            ->where('status', PurchaseOrderStatus::COMPLETED)
            ->sum('total_amount') ?? 0.0;
    }

    /**
     * Get the supplier's average order value.
     */
    public function getAverageOrderValueAttribute(): float
    {
        $completedOrders = $this->purchaseOrders()
            ->where('status', PurchaseOrderStatus::COMPLETED);

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
        $completedOrders = $this->purchaseOrders()->where('status', PurchaseOrderStatus::COMPLETED)->count();
        $onTimeDeliveries = $this->purchaseOrders()
            ->where('status', PurchaseOrderStatus::COMPLETED)
            ->whereRaw('actual_delivery_date <= expected_delivery_date')
            ->count();

        return [
            'total_orders' => $totalOrders,
            'completion_rate' => $totalOrders > 0 ? ($completedOrders / $totalOrders) * 100 : 0,
            'on_time_delivery_rate' => $completedOrders > 0 ? ($onTimeDeliveries / $completedOrders) * 100 : 0,
            'average_lead_time' => $this->default_lead_time_days,
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
               $this->purchaseOrders()->where('status', PurchaseOrderStatus::COMPLETED)->count() >= 5;
    }

    /**
     * Get expected delivery date for a new order.
     */
    public function getExpectedDeliveryDate(?\Carbon\Carbon $orderDate = null): \Carbon\Carbon
    {
        $orderDate = $orderDate ?? now();
        return $orderDate->addDays($this->default_lead_time_days);
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get suppliers that can fulfill an order within a given lead time.
     */
    public static function getQualifiedSuppliers(?int $maxLeadTimeDays = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = static::active();

        if ($maxLeadTimeDays !== null) {
            $query->where('default_lead_time_days', '<=', $maxLeadTimeDays);
        }

        return $query->orderBy('default_lead_time_days')->get();
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
