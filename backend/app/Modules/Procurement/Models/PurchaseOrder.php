<?php

namespace App\Modules\Procurement\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\Enums\PurchaseOrderStatus;

class PurchaseOrder extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'supplier_id',
        'user_id',
        'po_number',
        'status',
        'order_date',
        'expected_delivery_date',
        'delivered_at',
        'subtotal',
        'tax_amount',
        'shipping_cost',
        'total_amount',
        'notes'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'status' => PurchaseOrderStatus::class,
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'delivered_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'total_amount' => 'decimal:2'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the supplier for this purchase order.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the user who created this purchase order.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    /**
     * Get the items for this purchase order.
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /**
     * Get the procurement requests that generated this PO.
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
     * Scope to get purchase orders by status.
     */
    public function scopeByStatus($query, PurchaseOrderStatus $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get pending purchase orders.
     */
    public function scopePending($query)
    {
        return $query->where('status', PurchaseOrderStatus::PENDING);
    }

    /**
     * Scope to get approved purchase orders.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', PurchaseOrderStatus::APPROVED);
    }

    /**
     * Scope to get orders within date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('order_date', [$startDate, $endDate]);
    }

    /**
     * Scope to get overdue orders.
     */
    public function scopeOverdue($query)
    {
        return $query->where('expected_delivery_date', '<', now())
                    ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT]);
    }

    /**
     * Scope to get orders by supplier.
     */
    public function scopeBySupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the total number of items in this PO.
     */
    public function getTotalItemsAttribute(): int
    {
        return $this->items()->count();
    }

    /**
     * Get the total quantity across all items.
     */
    public function getTotalQuantityAttribute(): int
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Check if the order is overdue.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->expected_delivery_date && 
               $this->expected_delivery_date->isPast() && 
               !$this->isDelivered();
    }

    /**
     * Get days until expected delivery.
     */
    public function getDaysUntilDeliveryAttribute(): ?int
    {
        if (!$this->expected_delivery_date) {
            return null;
        }
        
        return now()->diffInDays($this->expected_delivery_date, false);
    }

    /**
     * Get delivery performance (on-time, late, early).
     */
    public function getDeliveryPerformanceAttribute(): ?string
    {
        if (!$this->delivered_at || !$this->expected_delivery_date) {
            return null;
        }
        
        if ($this->delivered_at->isSameDay($this->expected_delivery_date)) {
            return 'on_time';
        } elseif ($this->delivered_at->isAfter($this->expected_delivery_date)) {
            return 'late';
        } else {
            return 'early';
        }
    }

    /**
     * Get days variance from expected delivery.
     */
    public function getDeliveryVarianceDaysAttribute(): ?int
    {
        if (!$this->delivered_at || !$this->expected_delivery_date) {
            return null;
        }
        
        return $this->expected_delivery_date->diffInDays($this->delivered_at, false);
    }

    /*
    |--------------------------------------------------------------------------
    | Status Management
    |--------------------------------------------------------------------------
    */

    /**
     * Check if the order can be approved.
     */
    public function canBeApproved(): bool
    {
        return $this->status === PurchaseOrderStatus::PENDING && 
               $this->items()->exists() && 
               $this->total_amount > 0;
    }

    /**
     * Check if the order can be sent to supplier.
     */
    public function canBeSent(): bool
    {
        return $this->status === PurchaseOrderStatus::APPROVED;
    }

    /**
     * Check if the order can be marked as delivered.
     */
    public function canBeDelivered(): bool
    {
        return in_array($this->status, [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT]);
    }

    /**
     * Check if the order can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return !in_array($this->status, [PurchaseOrderStatus::DELIVERED, PurchaseOrderStatus::CANCELLED]);
    }

    /**
     * Check if the order is delivered.
     */
    public function isDelivered(): bool
    {
        return $this->status === PurchaseOrderStatus::DELIVERED;
    }

    /**
     * Approve the purchase order.
     */
    public function approve(): bool
    {
        if (!$this->canBeApproved()) {
            return false;
        }
        
        $this->status = PurchaseOrderStatus::APPROVED;
        return $this->save();
    }

    /**
     * Send the purchase order to supplier.
     */
    public function sendToSupplier(): bool
    {
        if (!$this->canBeSent()) {
            return false;
        }
        
        $this->status = PurchaseOrderStatus::SENT;
        return $this->save();
    }

    /**
     * Mark the purchase order as delivered.
     */
    public function markAsDelivered(\Carbon\Carbon $deliveredAt = null): bool
    {
        if (!$this->canBeDelivered()) {
            return false;
        }
        
        $this->status = PurchaseOrderStatus::DELIVERED;
        $this->delivered_at = $deliveredAt ?? now();
        return $this->save();
    }

    /**
     * Cancel the purchase order.
     */
    public function cancel(string $reason = null): bool
    {
        if (!$this->canBeCancelled()) {
            return false;
        }
        
        $this->status = PurchaseOrderStatus::CANCELLED;
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
     * Calculate totals from items.
     */
    public function calculateTotals(): void
    {
        $this->subtotal = $this->items()->selectRaw('SUM(quantity * unit_cost) as total')->value('total') ?? 0;
        
        // Calculate tax (assuming 12% VAT - configurable)
        $taxRate = config('ims.tax_rate', 0.12);
        $this->tax_amount = $this->subtotal * $taxRate;
        
        // Calculate total
        $this->total_amount = $this->subtotal + $this->tax_amount + $this->shipping_cost;
    }

    /**
     * Generate unique PO number.
     */
    public static function generatePoNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        
        // Format: PO-YYMM-XXXX
        $prefix = "PO-" . substr($year, 2) . $month . "-";
        
        $lastPo = static::where('po_number', 'like', $prefix . '%')
            ->orderBy('po_number', 'desc')
            ->first();
        
        if ($lastPo) {
            $lastNumber = (int) substr($lastPo->po_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Check if PO meets supplier minimum order value.
     */
    public function meetsSupplierMinimum(): bool
    {
        return $this->supplier && $this->total_amount >= $this->supplier->minimum_order_value;
    }

    /**
     * Get expected delivery window (considering lead time variance).
     */
    public function getExpectedDeliveryWindow(): array
    {
        if (!$this->expected_delivery_date) {
            return [];
        }
        
        // Add ±2 days buffer for realistic delivery window
        return [
            'earliest' => $this->expected_delivery_date->copy()->subDays(2),
            'expected' => $this->expected_delivery_date,
            'latest' => $this->expected_delivery_date->copy()->addDays(2)
        ];
    }

    /**
     * Get PO performance metrics.
     */
    public function getPerformanceMetrics(): array
    {
        return [
            'total_value' => $this->total_amount,
            'item_count' => $this->total_items,
            'total_quantity' => $this->total_quantity,
            'is_overdue' => $this->is_overdue,
            'days_until_delivery' => $this->days_until_delivery,
            'delivery_performance' => $this->delivery_performance,
            'delivery_variance_days' => $this->delivery_variance_days,
            'meets_supplier_minimum' => $this->meetsSupplierMinimum()
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get purchase orders requiring attention.
     */
    public static function getRequiringAttention(): \Illuminate\Database\Eloquent\Collection
    {
        return static::where(function($query) {
            $query->where('status', PurchaseOrderStatus::PENDING)
                  ->orWhere(function($q) {
                      $q->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT])
                        ->where('expected_delivery_date', '<', now());
                  });
        })
        ->with(['supplier', 'items'])
        ->orderBy('expected_delivery_date')
        ->get();
    }

    /**
     * Get total purchase value for a period.
     */
    public static function getTotalValueForPeriod(\Carbon\Carbon $startDate, \Carbon\Carbon $endDate): float
    {
        return static::whereBetween('order_date', [$startDate, $endDate])
            ->whereIn('status', [PurchaseOrderStatus::APPROVED, PurchaseOrderStatus::SENT, PurchaseOrderStatus::DELIVERED])
            ->sum('total_amount') ?? 0.0;
    }
}