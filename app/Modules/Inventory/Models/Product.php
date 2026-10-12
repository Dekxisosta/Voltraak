<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Support\Enums\BatchStatus;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'category',
        'description',
        'unit_price',
        'quantity',
        'reorder_level',
        'max_stock_level',
        'is_seasonal',
        'shelf_life_days',
        'storage_bin',
        'barcode',
        'is_active',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'is_seasonal' => 'boolean',
        'is_active' => 'boolean',
        'quantity' => 'integer',
        'reorder_level' => 'integer',
        'max_stock_level' => 'integer',
        'shelf_life_days' => 'integer',
    ];

    /**
     * Get all batches for this product
     */
    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class);
    }

    /**
     * Get active batches only
     */
    public function activeBatches(): HasMany
    {
        return $this->batches()->whereIn('status', [BatchStatus::SAFE->value, BatchStatus::WARNING->value]);
    }

    /**
     * Get expired batches
     */
    public function expiredBatches(): HasMany
    {
        return $this->batches()->where('status', BatchStatus::EXPIRED->value);
    }

    /**
     * Get stock transactions for this product
     */
    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    /**
     * Get physical counts for this product
     */
    public function physicalCounts(): HasMany
    {
        return $this->hasMany(PhysicalCount::class);
    }

    /**
     * Get reservations for this product
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Get damage reports for this product
     */
    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }

    /**
     * Get discrepancy reports for this product
     */
    public function discrepancyReports(): HasMany
    {
        return $this->hasMany(DiscrepancyReport::class);
    }

    /**
     * Check if product is low stock
     */
    public function isLowStock(): bool
    {
        return $this->quantity <= $this->reorder_level;
    }

    /**
     * Check if product is out of stock
     */
    public function isOutOfStock(): bool
    {
        return $this->quantity <= 0;
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
     * Get stock status
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->isOutOfStock()) {
            return 'out_of_stock';
        }
        
        if ($this->isLowStock()) {
            return 'low_stock';
        }
        
        return 'in_stock';
    }

    /**
     * Get batches sorted by FEFO (First-Expired, First-Out)
     */
    public function getBatchesFefoOrder()
    {
        return $this->activeBatches()
            ->where('quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->orderBy('manufacture_date', 'asc')
            ->get();
    }

    /**
     * Check if product has expiring batches (within warning period)
     */
    public function hasExpiringBatches(): bool
    {
        $warningDays = config('ims.expiry.warning_days', 60);
        
        return $this->batches()
            ->where('status', BatchStatus::WARNING->value)
            ->where('expiry_date', '<=', now()->addDays($warningDays))
            ->exists();
    }

    /**
     * Get total value of current stock
     */
    public function getTotalStockValueAttribute(): float
    {
        return $this->quantity * $this->unit_price;
    }

    /**
     * Scope: Active products only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Products by category
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: Low stock products
     */
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'reorder_level');
    }

    /**
     * Scope: Out of stock products
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

    /**
     * Scope: Seasonal products
     */
    public function scopeSeasonal($query, bool $seasonal = true)
    {
        return $query->where('is_seasonal', $seasonal);
    }

    /**
     * Scope: Search products by name or SKU
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('sku', 'like', "%{$search}%")
              ->orWhere('barcode', 'like', "%{$search}%");
        });
    }

    /**
     * Update stock quantity
     */
    public function updateStock(int $quantity, string $operation = 'set'): bool
    {
        switch ($operation) {
            case 'add':
                $this->quantity += $quantity;
                break;
            case 'subtract':
                $this->quantity = max(0, $this->quantity - $quantity);
                break;
            case 'set':
            default:
                $this->quantity = max(0, $quantity);
                break;
        }
        
        return $this->save();
    }

    /**
     * Check if sufficient quantity is available for operation
     */
    public function hasSufficientQuantity(int $requiredQuantity): bool
    {
        return $this->available_quantity >= $requiredQuantity;
    }

    /**
     * Get stock movement history
     */
    public function getStockHistory(int $days = 30)
    {
        return $this->stockTransactions()
            ->where('transaction_date', '>=', now()->subDays($days))
            ->orderBy('transaction_date', 'desc')
            ->get();
    }
}