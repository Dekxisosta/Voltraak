<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\UserManagement\Models\User;

class PhysicalCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'counted_by',
        'system_quantity',
        'counted_quantity',
        'variance_percentage',
        'accuracy_percentage',
        'exceeds_threshold',
        'threshold_used',
        'count_reference',
        'notes',
        'count_date',
    ];

    protected $casts = [
        'system_quantity' => 'integer',
        'counted_quantity' => 'integer',
        'variance_percentage' => 'decimal:2',
        'accuracy_percentage' => 'decimal:2',
        'exceeds_threshold' => 'boolean',
        'threshold_used' => 'decimal:2',
        'count_date' => 'datetime',
    ];

    /**
     * Get the product this count belongs to
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who performed the count
     */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counted_by');
    }

    /**
     * Get variance (computed column from database)
     */
    public function getVarianceAttribute(): int
    {
        return $this->counted_quantity - $this->system_quantity;
    }

    /**
     * Calculate and set variance percentage
     */
    public function calculateVariancePercentage(): void
    {
        if ($this->system_quantity > 0) {
            $this->variance_percentage = (abs($this->variance) / $this->system_quantity) * 100;
        } else {
            $this->variance_percentage = $this->counted_quantity > 0 ? 100 : 0;
        }
    }

    /**
     * Calculate and set accuracy percentage
     */
    public function calculateAccuracyPercentage(): void
    {
        if ($this->system_quantity > 0) {
            $this->accuracy_percentage = ($this->counted_quantity / $this->system_quantity) * 100;
        } else {
            $this->accuracy_percentage = $this->counted_quantity === 0 ? 100 : 0;
        }
    }

    /**
     * Check if variance exceeds threshold
     */
    public function checkThresholdExceeded(float $threshold = null): bool
    {
        $threshold = $threshold ?? config('ims.variance.default_threshold_percent', 5.0);
        $this->threshold_used = $threshold;
        $this->exceeds_threshold = abs($this->variance_percentage) > $threshold;
        
        return $this->exceeds_threshold;
    }

    /**
     * Get shrinkage percentage (if variance is negative)
     */
    public function getShrinkagePercentageAttribute(): float
    {
        if ($this->variance >= 0) {
            return 0;
        }
        
        return $this->system_quantity > 0 
            ? (abs($this->variance) / $this->system_quantity) * 100 
            : 0;
    }

    /**
     * Check if this is a shrinkage case
     */
    public function isShrinkage(): bool
    {
        return $this->variance < 0;
    }

    /**
     * Check if this is an overage case
     */
    public function isOverage(): bool
    {
        return $this->variance > 0;
    }

    /**
     * Get count accuracy level
     */
    public function getAccuracyLevelAttribute(): string
    {
        return match(true) {
            $this->accuracy_percentage >= 98 => 'excellent',
            $this->accuracy_percentage >= 95 => 'good',
            $this->accuracy_percentage >= 90 => 'fair',
            default => 'poor',
        };
    }

    /**
     * Scope: Counts with variances exceeding threshold
     */
    public function scopeExceedsThreshold($query)
    {
        return $query->where('exceeds_threshold', true);
    }

    /**
     * Scope: Recent counts
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('count_date', '>=', now()->subDays($days));
    }

    /**
     * Scope: By date range
     */
    public function scopeDateRange($query, $startDate, $endDate = null)
    {
        $query->where('count_date', '>=', $startDate);
        
        if ($endDate) {
            $query->where('count_date', '<=', $endDate);
        }
        
        return $query;
    }

    /**
     * Scope: By counter (user)
     */
    public function scopeByCounter($query, int $userId)
    {
        return $query->where('counted_by', $userId);
    }

    /**
     * Scope: Shrinkage cases only
     */
    public function scopeShrinkage($query)
    {
        return $query->whereRaw('counted_quantity < system_quantity');
    }

    /**
     * Scope: Overage cases only
     */
    public function scopeOverage($query)
    {
        return $query->whereRaw('counted_quantity > system_quantity');
    }

    /**
     * Scope: Perfect counts (no variance)
     */
    public function scopePerfect($query)
    {
        return $query->whereRaw('counted_quantity = system_quantity');
    }

    /**
     * Boot method to calculate percentages automatically
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($count) {
            $count->calculateVariancePercentage();
            $count->calculateAccuracyPercentage();
            
            if ($count->threshold_used === null) {
                $count->checkThresholdExceeded();
            }
            
            if (!$count->count_date) {
                $count->count_date = now();
            }
        });
    }

    /**
     * Get variance summary for multiple counts
     */
    public static function getVarianceSummary($productIds = null, int $days = 30): array
    {
        $query = static::recent($days);
        
        if ($productIds) {
            $query->whereIn('product_id', (array) $productIds);
        }
        
        $counts = $query->get();
        
        return [
            'total_counts' => $counts->count(),
            'perfect_counts' => $counts->where('variance', 0)->count(),
            'shrinkage_counts' => $counts->where('variance', '<', 0)->count(),
            'overage_counts' => $counts->where('variance', '>', 0)->count(),
            'threshold_exceeded' => $counts->where('exceeds_threshold', true)->count(),
            'average_accuracy' => $counts->avg('accuracy_percentage'),
            'total_variance' => $counts->sum('variance'),
            'total_shrinkage' => $counts->where('variance', '<', 0)->sum('variance'),
            'total_overage' => $counts->where('variance', '>', 0)->sum('variance'),
        ];
    }

    /**
     * Get accuracy trends over time
     */
    public static function getAccuracyTrends(int $days = 30): array
    {
        $counts = static::recent($days)
            ->selectRaw('DATE(count_date) as date, AVG(accuracy_percentage) as avg_accuracy, COUNT(*) as count_total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $trends = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $trends[$date] = [
                'date' => $date,
                'accuracy' => 0,
                'count_total' => 0,
            ];
        }

        foreach ($counts as $count) {
            $trends[$count->date] = [
                'date' => $count->date,
                'accuracy' => round($count->avg_accuracy, 2),
                'count_total' => $count->count_total,
            ];
        }

        return array_values($trends);
    }
}