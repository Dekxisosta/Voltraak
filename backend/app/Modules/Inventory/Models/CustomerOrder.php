<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\OrderStatus;

class CustomerOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_address',
        'status',
        'total_amount',
        'total_items',
        'required_date',
        'fulfilled_date',
        'created_by',
        'notes',
        'order_date',
    ];

    protected $casts = [
        'status' => OrderStatus::class,
        'total_amount' => 'decimal:2',
        'total_items' => 'integer',
        'required_date' => 'date',
        'fulfilled_date' => 'date',
        'order_date' => 'datetime',
    ];

    /**
     * Get the user who created this order
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get reservations for this order
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Check if order can be modified
     */
    public function canBeModified(): bool
    {
        return $this->status->allowsModification();
    }

    /**
     * Check if order is overdue
     */
    public function isOverdue(): bool
    {
        return $this->required_date && 
               $this->required_date->isPast() && 
               !in_array($this->status, [OrderStatus::FULFILLED, OrderStatus::CANCELLED]);
    }

    /**
     * Get order progress percentage
     */
    public function getProgressPercentageAttribute(): float
    {
        if ($this->total_items === 0) {
            return 0;
        }

        $fulfilledItems = $this->reservations()->where('status', 'fulfilled')->sum('quantity');
        return min(100, ($fulfilledItems / $this->total_items) * 100);
    }

    /**
     * Calculate total amount from reservations
     */
    public function calculateTotalAmount(): void
    {
        $this->total_amount = $this->reservations()->sum('total_price');
        $this->total_items = $this->reservations()->sum('quantity');
    }

    /**
     * Confirm the order
     */
    public function confirm(): bool
    {
        if ($this->status === OrderStatus::PENDING) {
            $this->status = OrderStatus::CONFIRMED;
            return $this->save();
        }
        
        return false;
    }

    /**
     * Fulfill the order
     */
    public function fulfill(): bool
    {
        if ($this->status === OrderStatus::CONFIRMED) {
            $this->status = OrderStatus::FULFILLED;
            $this->fulfilled_date = now();
            return $this->save();
        }
        
        return false;
    }

    /**
     * Cancel the order
     */
    public function cancel(): bool
    {
        if ($this->canBeModified()) {
            $this->status = OrderStatus::CANCELLED;
            // Release all reservations
            $this->reservations()->update(['status' => 'cancelled']);
            return $this->save();
        }
        
        return false;
    }

    /**
     * Get days until required date
     */
    public function getDaysUntilRequiredAttribute(): ?int
    {
        if (!$this->required_date) {
            return null;
        }

        return now()->diffInDays($this->required_date, false);
    }

    /**
     * Scope: By status
     */
    public function scopeByStatus($query, OrderStatus $status)
    {
        return $query->where('status', $status->value);
    }

    /**
     * Scope: Pending orders
     */
    public function scopePending($query)
    {
        return $query->where('status', OrderStatus::PENDING->value);
    }

    /**
     * Scope: Confirmed orders
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', OrderStatus::CONFIRMED->value);
    }

    /**
     * Scope: Fulfilled orders
     */
    public function scopeFulfilled($query)
    {
        return $query->where('status', OrderStatus::FULFILLED->value);
    }

    /**
     * Scope: Cancelled orders
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', OrderStatus::CANCELLED->value);
    }

    /**
     * Scope: Overdue orders
     */
    public function scopeOverdue($query)
    {
        return $query->where('required_date', '<', now())
                    ->whereNotIn('status', [OrderStatus::FULFILLED->value, OrderStatus::CANCELLED->value]);
    }

    /**
     * Scope: Due today
     */
    public function scopeDueToday($query)
    {
        return $query->whereDate('required_date', now())
                    ->whereNotIn('status', [OrderStatus::FULFILLED->value, OrderStatus::CANCELLED->value]);
    }

    /**
     * Scope: Recent orders
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('order_date', '>=', now()->subDays($days));
    }

    /**
     * Scope: Search by customer
     */
    public function scopeSearchCustomer($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('customer_name', 'like', "%{$search}%")
              ->orWhere('customer_email', 'like', "%{$search}%")
              ->orWhere('order_number', 'like', "%{$search}%");
        });
    }

    /**
     * Generate unique order number
     */
    public static function generateOrderNumber(): string
    {
        $prefix = 'ORD';
        $date = now()->format('Ymd');
        $counter = static::whereDate('order_date', now())->count() + 1;
        
        return sprintf('%s-%s-%04d', $prefix, $date, $counter);
    }

    /**
     * Boot method to set defaults
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($order) {
            if (!$order->order_number) {
                $order->order_number = static::generateOrderNumber();
            }
            
            if (!$order->order_date) {
                $order->order_date = now();
            }
            
            if (!$order->status) {
                $order->status = OrderStatus::PENDING;
            }
        });

        static::saved(function ($order) {
            $order->calculateTotalAmount();
            if ($order->wasChanged(['total_amount', 'total_items'])) {
                $order->saveQuietly(); // Prevent infinite loop
            }
        });
    }
}