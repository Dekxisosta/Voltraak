<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\UserManagement\Models\User;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'customer_order_id',
        'batch_id',
        'quantity',
        'unit_price',
        'status',
        'reserved_at',
        'expires_at',
        'fulfilled_at',
        'reserved_by',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'reserved_at' => 'datetime',
        'expires_at' => 'datetime',
        'fulfilled_at' => 'datetime',
    ];

    /**
     * Get the product this reservation is for
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the customer order this reservation belongs to
     */
    public function customerOrder(): BelongsTo
    {
        return $this->belongsTo(CustomerOrder::class);
    }

    /**
     * Get the batch this reservation is for
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the user who made the reservation
     */
    public function reserver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reserved_by');
    }

    /**
     * Get total price (computed attribute)
     */
    public function getTotalPriceAttribute(): float
    {
        return $this->quantity * $this->unit_price;
    }

    /**
     * Check if reservation is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Check if reservation is active
     */
    public function isActive(): bool
    {
        return in_array($this->status, ['pending', 'confirmed', 'allocated']) && !$this->isExpired();
    }

    /**
     * Check if reservation can be fulfilled
     */
    public function canBeFulfilled(): bool
    {
        return $this->status === 'allocated' && 
               !$this->isExpired() && 
               $this->batch && 
               $this->batch->hasSufficientQuantity($this->quantity);
    }

    /**
     * Confirm the reservation
     */
    public function confirm(): bool
    {
        if ($this->status === 'pending' && !$this->isExpired()) {
            $this->status = 'confirmed';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Allocate specific batch to reservation
     */
    public function allocate(Batch $batch): bool
    {
        if ($this->status === 'confirmed' && 
            $batch->product_id === $this->product_id && 
            $batch->hasSufficientQuantity($this->quantity)) {
            
            $this->batch_id = $batch->id;
            $this->status = 'allocated';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Fulfill the reservation
     */
    public function fulfill(): bool
    {
        if ($this->canBeFulfilled()) {
            // Reduce batch quantity
            if (!$this->batch->reduceQuantity($this->quantity)) {
                return false;
            }
            
            // Update product quantity
            $this->product->updateStock($this->quantity, 'subtract');
            
            // Mark as fulfilled
            $this->status = 'fulfilled';
            $this->fulfilled_at = now();
            
            return $this->save();
        }
        
        return false;
    }

    /**
     * Cancel the reservation
     */
    public function cancel(): bool
    {
        if (in_array($this->status, ['pending', 'confirmed', 'allocated'])) {
            $this->status = 'cancelled';
            $this->batch_id = null; // Release batch allocation
            return $this->save();
        }
        
        return false;
    }

    /**
     * Release the reservation (expire it)
     */
    public function release(): bool
    {
        return $this->cancel();
    }

    /**
     * Extend expiration time
     */
    public function extend(int $hours = 24): bool
    {
        if ($this->isActive()) {
            $this->expires_at = ($this->expires_at ?? now())->addHours($hours);
            return $this->save();
        }
        
        return false;
    }

    /**
     * Scope: Active reservations
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'confirmed', 'allocated'])
                    ->where(function ($q) {
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                    });
    }

    /**
     * Scope: Expired reservations
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now())
                    ->whereIn('status', ['pending', 'confirmed', 'allocated']);
    }

    /**
     * Scope: By status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Pending reservations
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Confirmed reservations
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Scope: Allocated reservations
     */
    public function scopeAllocated($query)
    {
        return $query->where('status', 'allocated');
    }

    /**
     * Scope: Fulfilled reservations
     */
    public function scopeFulfilled($query)
    {
        return $query->where('status', 'fulfilled');
    }

    /**
     * Scope: Expiring soon
     */
    public function scopeExpiringSoon($query, int $hours = 2)
    {
        return $query->where('expires_at', '<=', now()->addHours($hours))
                    ->where('expires_at', '>', now())
                    ->whereIn('status', ['pending', 'confirmed', 'allocated']);
    }

    /**
     * Auto-allocate to best available batch (FEFO)
     */
    public function autoAllocate(): bool
    {
        if ($this->status !== 'confirmed') {
            return false;
        }

        $batch = $this->product->getBatchesFefoOrder()
            ->where('quantity', '>=', $this->quantity)
            ->first();

        return $batch ? $this->allocate($batch) : false;
    }

    /**
     * Boot method to set defaults
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($reservation) {
            if (!$reservation->reserved_at) {
                $reservation->reserved_at = now();
            }
            
            if (!$reservation->expires_at) {
                // Default 24 hour expiration
                $reservation->expires_at = now()->addHours(24);
            }
            
            if (!$reservation->status) {
                $reservation->status = 'pending';
            }
        });
    }

    /**
     * Clean up expired reservations
     */
    public static function cleanupExpired(): int
    {
        return static::expired()->update(['status' => 'cancelled', 'batch_id' => null]);
    }
}