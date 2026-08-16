<?php

namespace App\Modules\Procurement\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'notes'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the purchase order for this item.
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Get the product for this item.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Inventory\Models\Product::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors & Mutators
    |--------------------------------------------------------------------------
    */

    /**
     * Get the cost variance from product unit cost.
     */
    public function getCostVarianceAttribute(): ?float
    {
        if (!$this->product || !$this->product->unit_cost) {
            return null;
        }
        
        return $this->unit_cost - $this->product->unit_cost;
    }

    /**
     * Get the cost variance percentage from product unit cost.
     */
    public function getCostVariancePercentageAttribute(): ?float
    {
        if (!$this->product || !$this->product->unit_cost || $this->product->unit_cost == 0) {
            return null;
        }
        
        return (($this->unit_cost - $this->product->unit_cost) / $this->product->unit_cost) * 100;
    }

    /**
     * Check if this item has a significant cost variance.
     */
    public function getHasSignificantVarianceAttribute(): bool
    {
        $variance = $this->cost_variance_percentage;
        return $variance !== null && abs($variance) > 10; // 10% threshold
    }

    /**
     * Get the total value impact on inventory.
     */
    public function getInventoryValueImpactAttribute(): float
    {
        return $this->quantity * $this->unit_cost;
    }

    /*
    |--------------------------------------------------------------------------
    | Model Events
    |--------------------------------------------------------------------------
    */

    /**
     * Boot the model and set up event listeners.
     */
    protected static function boot()
    {
        parent::boot();
        
        // Auto-calculate total cost when saving
        static::saving(function ($item) {
            $item->total_cost = $item->quantity * $item->unit_cost;
        });
        
        // Recalculate PO totals when item is saved/deleted
        static::saved(function ($item) {
            $item->purchaseOrder->calculateTotals();
            $item->purchaseOrder->save();
        });
        
        static::deleted(function ($item) {
            $item->purchaseOrder->calculateTotals();
            $item->purchaseOrder->save();
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Business Logic Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if quantity meets product reorder requirements.
     */
    public function meetsReorderRequirement(): bool
    {
        if (!$this->product) {
            return false;
        }
        
        $currentStock = $this->product->current_quantity;
        $reorderPoint = $this->product->reorder_point;
        
        // Check if current stock + this order quantity brings stock above reorder point
        return ($currentStock + $this->quantity) > $reorderPoint;
    }

    /**
     * Get recommended quantity based on reorder point and current stock.
     */
    public function getRecommendedQuantity(): int
    {
        if (!$this->product) {
            return $this->quantity;
        }
        
        $currentStock = $this->product->current_quantity;
        $reorderPoint = $this->product->reorder_point;
        
        // Recommend quantity to reach 2x reorder point (safety buffer)
        $targetStock = $reorderPoint * 2;
        $recommendedQuantity = max($targetStock - $currentStock, 1);
        
        return $recommendedQuantity;
    }

    /**
     * Check if unit cost is within acceptable variance from product cost.
     */
    public function isWithinAcceptableVariance(float $maxVariancePercent = 15): bool
    {
        $variance = $this->cost_variance_percentage;
        return $variance === null || abs($variance) <= $maxVariancePercent;
    }

    /**
     * Get cost analysis for this item.
     */
    public function getCostAnalysis(): array
    {
        $analysis = [
            'item_unit_cost' => $this->unit_cost,
            'item_total_cost' => $this->total_cost,
            'quantity' => $this->quantity
        ];
        
        if ($this->product) {
            $analysis['product_unit_cost'] = $this->product->unit_cost;
            $analysis['cost_variance'] = $this->cost_variance;
            $analysis['cost_variance_percentage'] = $this->cost_variance_percentage;
            $analysis['has_significant_variance'] = $this->has_significant_variance;
            $analysis['is_cost_increase'] = $this->cost_variance > 0;
            $analysis['variance_amount_total'] = $this->cost_variance * $this->quantity;
        }
        
        return $analysis;
    }

    /**
     * Get stock impact analysis.
     */
    public function getStockImpactAnalysis(): array
    {
        $analysis = [
            'ordered_quantity' => $this->quantity,
            'inventory_value_impact' => $this->inventory_value_impact
        ];
        
        if ($this->product) {
            $analysis['current_stock'] = $this->product->current_quantity;
            $analysis['reorder_point'] = $this->product->reorder_point;
            $analysis['stock_after_delivery'] = $this->product->current_quantity + $this->quantity;
            $analysis['meets_reorder_requirement'] = $this->meetsReorderRequirement();
            $analysis['recommended_quantity'] = $this->getRecommendedQuantity();
            $analysis['is_over_ordered'] = $this->quantity > $this->getRecommendedQuantity() * 1.5;
            $analysis['is_under_ordered'] = $this->quantity < ($this->product->reorder_point - $this->product->current_quantity);
        }
        
        return $analysis;
    }

    /*
    |--------------------------------------------------------------------------
    | Validation Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Validate that the item is ready for ordering.
     */
    public function validateForOrdering(): array
    {
        $issues = [];
        
        if (!$this->product) {
            $issues[] = 'Product not found';
            return $issues;
        }
        
        if (!$this->product->is_active) {
            $issues[] = 'Product is inactive';
        }
        
        if ($this->quantity <= 0) {
            $issues[] = 'Quantity must be greater than zero';
        }
        
        if ($this->unit_cost <= 0) {
            $issues[] = 'Unit cost must be greater than zero';
        }
        
        if ($this->has_significant_variance) {
            $issues[] = "Significant cost variance: {$this->cost_variance_percentage}%";
        }
        
        return $issues;
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Create items from product list with quantities.
     */
    public static function createFromProductList(PurchaseOrder $purchaseOrder, array $products): \Illuminate\Database\Eloquent\Collection
    {
        $items = collect();
        
        foreach ($products as $productData) {
            $product = \App\Modules\Inventory\Models\Product::find($productData['product_id']);
            
            if ($product) {
                $item = static::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'product_id' => $product->id,
                    'quantity' => $productData['quantity'],
                    'unit_cost' => $productData['unit_cost'] ?? $product->unit_cost,
                    'notes' => $productData['notes'] ?? null
                ]);
                
                $items->push($item);
            }
        }
        
        return $items;
    }

    /**
     * Get items with significant cost variances.
     */
    public static function getWithSignificantVariances(float $thresholdPercent = 10): \Illuminate\Database\Eloquent\Collection
    {
        return static::with(['product', 'purchaseOrder'])
            ->get()
            ->filter(function ($item) use ($thresholdPercent) {
                return $item->cost_variance_percentage !== null && 
                       abs($item->cost_variance_percentage) > $thresholdPercent;
            });
    }

    /**
     * Get total value by product for a period.
     */
    public static function getTotalValueByProduct(\Carbon\Carbon $startDate, \Carbon\Carbon $endDate): \Illuminate\Support\Collection
    {
        return static::join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
            ->join('products', 'purchase_order_items.product_id', '=', 'products.id')
            ->whereBetween('purchase_orders.order_date', [$startDate, $endDate])
            ->whereIn('purchase_orders.status', ['approved', 'sent', 'delivered'])
            ->selectRaw('
                products.id,
                products.name,
                products.sku,
                SUM(purchase_order_items.quantity) as total_quantity,
                SUM(purchase_order_items.total_cost) as total_value,
                AVG(purchase_order_items.unit_cost) as average_unit_cost,
                COUNT(DISTINCT purchase_orders.id) as order_count
            ')
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderBy('total_value', 'desc')
            ->get();
    }
}