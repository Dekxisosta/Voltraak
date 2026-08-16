<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\StockTransactionType;

class StockTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'batch_id',
        'user_id',
        'type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'unit_cost',
        'total_cost',
        'reference_number',
        'reference_type',
        'reference_id',
        'notes',
        'transaction_date',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'quantity_before' => 'integer',
        'quantity_after' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'reference_id' => 'integer',
        'transaction_date' => 'datetime',
        'type' => StockTransactionType::class,
    ];

    /**
     * Get the product this transaction belongs to
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the batch this transaction belongs to
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the user who performed this transaction
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the referenced model (polymorphic)
     */
    public function referenceable()
    {
        if (!$this->reference_type || !$this->reference_id) {
            return null;
        }

        $modelClass = match($this->reference_type) {
            'purchase_order' => \App\Modules\Procurement\Models\PurchaseOrder::class,
            'customer_order' => \App\Modules\Inventory\Models\CustomerOrder::class,
            'damage_report' => \App\Modules\Inventory\Models\DamageReport::class,
            'physical_count' => \App\Modules\Inventory\Models\PhysicalCount::class,
            default => null,
        };

        return $modelClass ? $modelClass::find($this->reference_id) : null;
    }

    /**
     * Check if transaction increases stock
     */
    public function increasesStock(): bool
    {
        return $this->type->increasesStock();
    }

    /**
     * Check if transaction decreases stock
     */
    public function decreasesStock(): bool
    {
        return $this->type->decreasesStock();
    }

    /**
     * Get transaction impact (positive or negative quantity)
     */
    public function getImpactAttribute(): int
    {
        return $this->increasesStock() ? $this->quantity : -$this->quantity;
    }

    /**
     * Get transaction value
     */
    public function getTransactionValueAttribute(): float
    {
        return $this->quantity * ($this->unit_cost ?? $this->product->unit_price);
    }

    /**
     * Scope: By transaction type
     */
    public function scopeByType($query, StockTransactionType $type)
    {
        return $query->where('type', $type->value);
    }

    /**
     * Scope: Stock in transactions
     */
    public function scopeStockIn($query)
    {
        return $query->where('type', StockTransactionType::IN->value);
    }

    /**
     * Scope: Stock out transactions
     */
    public function scopeStockOut($query)
    {
        return $query->where('type', StockTransactionType::OUT->value);
    }

    /**
     * Scope: By date range
     */
    public function scopeDateRange($query, $startDate, $endDate = null)
    {
        $query->where('transaction_date', '>=', $startDate);
        
        if ($endDate) {
            $query->where('transaction_date', '<=', $endDate);
        }
        
        return $query;
    }

    /**
     * Scope: Recent transactions
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('transaction_date', '>=', now()->subDays($days));
    }

    /**
     * Scope: By user
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: By product
     */
    public function scopeByProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope: By batch
     */
    public function scopeByBatch($query, int $batchId)
    {
        return $query->where('batch_id', $batchId);
    }

    /**
     * Scope: By reference
     */
    public function scopeByReference($query, string $referenceType, int $referenceId)
    {
        return $query->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId);
    }

    /**
     * Calculate total cost if not provided
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($transaction) {
            if (!$transaction->total_cost && $transaction->unit_cost) {
                $transaction->total_cost = $transaction->quantity * $transaction->unit_cost;
            }
            
            if (!$transaction->transaction_date) {
                $transaction->transaction_date = now();
            }
        });
    }

    /**
     * Get stock movement summary for product
     */
    public static function getMovementSummary(int $productId, int $days = 30): array
    {
        $transactions = static::where('product_id', $productId)
            ->where('transaction_date', '>=', now()->subDays($days))
            ->get();

        return [
            'total_in' => $transactions->where('type', StockTransactionType::IN->value)->sum('quantity'),
            'total_out' => $transactions->where('type', StockTransactionType::OUT->value)->sum('quantity'),
            'total_transfers' => $transactions->where('type', StockTransactionType::TRANSFER->value)->count(),
            'total_returns' => $transactions->where('type', StockTransactionType::RETURN->value)->sum('quantity'),
            'total_adjustments' => $transactions->where('type', StockTransactionType::ADJUSTMENT->value)->sum('quantity'),
            'net_movement' => $transactions->sum('impact'),
            'transaction_count' => $transactions->count(),
        ];
    }

    /**
     * Get daily movement data for charts
     */
    public static function getDailyMovements(int $productId, int $days = 30): array
    {
        $transactions = static::where('product_id', $productId)
            ->where('transaction_date', '>=', now()->subDays($days))
            ->selectRaw('DATE(transaction_date) as date, type, SUM(quantity) as total')
            ->groupBy('date', 'type')
            ->orderBy('date')
            ->get();

        $movements = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $movements[$date] = [
                'date' => $date,
                'stock_in' => 0,
                'stock_out' => 0,
                'net' => 0,
            ];
        }

        foreach ($transactions as $transaction) {
            $date = $transaction->date;
            if (isset($movements[$date])) {
                if ($transaction->type === StockTransactionType::IN->value) {
                    $movements[$date]['stock_in'] += $transaction->total;
                } elseif ($transaction->type === StockTransactionType::OUT->value) {
                    $movements[$date]['stock_out'] += $transaction->total;
                }
            }
        }

        // Calculate net movements
        foreach ($movements as &$movement) {
            $movement['net'] = $movement['stock_in'] - $movement['stock_out'];
        }

        return array_values($movements);
    }
}