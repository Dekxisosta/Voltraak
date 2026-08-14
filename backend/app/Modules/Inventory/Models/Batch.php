<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\Enums\BatchStatus;
use Carbon\Carbon;

class Batch extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'batch_number',
        'quantity',
        'received_quantity',
        'manufacture_date',
        'expiry_date',
        'status',
        'unit_cost',
        'supplier_batch_number',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'received_quantity' => 'integer',
        'manufacture_date' => 'date',
        'expiry_date' => 'date',
        'unit_cost' => 'decimal:2',
        'status' => BatchStatus::class,
    ];

    /**
     * Get the product this batch belongs to
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get stock transactions for this batch
     */
    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    /**
     * Get reservations for this batch
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Get damage reports for this batch
     */
    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }

    /**
     * Get discrepancy reports for this batch
     */
    public function discrepancyReports(): HasMany
    {
        return $this->hasMany(DiscrepancyReport::class);
    }

    /**
     * Check if batch is expired
     */
    public function isExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    /**
     * Check if batch is in warning period
     */
    public function isInWarningPeriod(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }

        $warningDays = config('ims.expiry.warning_days', 60);
        return $this->expiry_date->diffInDays(now()) <= $warningDays && !$this->isExpired();
    }

    /**
     * Get days remaining until expiry
     */
    public function getDaysToExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }

        return $this->expiry_date->diffInDays(now(), false);
    }

    /**
     * Get available quantity (excluding reservations)
     */
    public function getAvailableQuantityAttribute(): int
    {
        $reservedQuantity = $this->reservations()
            ->whereIn('status', ['pending', 'confirmed', 'allocated'])
            ->sum('quantity');
        
        return max(0, $this->quantity - $reservedQuantity);
    }

    /**
     * Update batch status based on expiry date
     */
    public function updateStatus(): bool
    {
        if (!$this->expiry_date) {
            $this->status = BatchStatus::SAFE;
            return $this->save();
        }

        if ($this->isExpired()) {
            $this->status = BatchStatus::EXPIRED;
        } elseif ($this->isInWarningPeriod()) {
            $this->status = BatchStatus::WARNING;
        } else {
            $this->status = BatchStatus::SAFE;
        }

        return $this->save();
    }

    /**
     * Check if batch can be used for stock operations
     */
    public function isUsable(): bool
    {
        return $this->status !== BatchStatus::EXPIRED && $this->quantity > 0;
    }

    /**
     * Get batch age in days
     */
    public function getAgeInDaysAttribute(): ?int
    {
        if (!$this->manufacture_date) {
            return null;
        }

        return $this->manufacture_date->diffInDays(now());
    }

    /**
     * Get shelf life percentage used
     */
    public function getShelfLifeUsedPercentageAttribute(): ?float
    {
        if (!$this->manufacture_date || !$this->expiry_date) {
            return null;
        }

        $totalShelfLife = $this->manufacture_date->diffInDays($this->expiry_date);
        $usedDays = $this->manufacture_date->diffInDays(now());

        return min(100, ($usedDays / $totalShelfLife) * 100);
    }

    /**
     * Reduce batch quantity
     */
    public function reduceQuantity(int $amount): bool
    {
        if ($amount > $this->quantity) {
            return false;
        }

        $this->quantity -= $amount;
        return $this->save();
    }

    /**
     * Increase batch quantity
     */
    public function increaseQuantity(int $amount): bool
    {
        $this->quantity += $amount;
        return $this->save();
    }

    /**
     * Check if batch has sufficient quantity
     */
    public function hasSufficientQuantity(int $requiredQuantity): bool
    {
        return $this->available_quantity >= $requiredQuantity;
    }

    /**
     * Get total value of batch
     */
    public function getTotalValueAttribute(): float
    {
        return $this->quantity * ($this->unit_cost ?? $this->product->unit_price);
    }

    /**
     * Scope: Active batches (not expired)
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', BatchStatus::EXPIRED->value);
    }

    /**
     * Scope: Expired batches
     */
    public function scopeExpired($query)
    {
        return $query->where('status', BatchStatus::EXPIRED->value);
    }

    /**
     * Scope: Warning batches (expiring soon)
     */
    public function scopeWarning($query)
    {
        return $query->where('status', BatchStatus::WARNING->value);
    }

    /**
     * Scope: Safe batches
     */
    public function scopeSafe($query)
    {
        return $query->where('status', BatchStatus::SAFE->value);
    }

    /**
     * Scope: Usable batches (not expired and has quantity)
     */
    public function scopeUsable($query)
    {
        return $query->where('status', '!=', BatchStatus::EXPIRED->value)
                    ->where('quantity', '>', 0);
    }

    /**
     * Scope: Order by FEFO (First-Expired, First-Out)
     */
    public function scopeFefoOrder($query)
    {
        return $query->orderBy('expiry_date', 'asc')
                    ->orderBy('manufacture_date', 'asc');
    }

    /**
     * Scope: Expiring within days
     */
    public function scopeExpiringWithin($query, int $days)
    {
        return $query->where('expiry_date', '<=', now()->addDays($days))
                    ->where('expiry_date', '>', now());
    }

    /**
     * Boot method to automatically update status
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($batch) {
            if ($batch->expiry_date) {
                $batch->updateStatus();
            }
        });
    }
}