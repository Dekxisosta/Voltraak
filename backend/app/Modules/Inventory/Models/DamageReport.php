<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\DamageType;

class DamageReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'batch_id',
        'quantity_damaged',
        'damage_type',
        'description',
        'estimated_value',
        'photo_path',
        'status',
        'reported_by',
        'investigated_by',
        'reported_at',
        'investigated_at',
        'investigation_notes',
        'action_taken',
    ];

    protected $casts = [
        'quantity_damaged' => 'integer',
        'estimated_value' => 'decimal:2',
        'reported_at' => 'datetime',
        'investigated_at' => 'datetime',
        'damage_type' => DamageType::class,
    ];

    /**
     * Get the product this damage report is for
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the batch this damage report is for
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the user who reported the damage
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the user who investigated the damage
     */
    public function investigator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investigated_by');
    }

    /**
     * Check if report can be investigated
     */
    public function canBeInvestigated(): bool
    {
        return $this->status === 'reported';
    }

    /**
     * Check if report can be approved
     */
    public function canBeApproved(): bool
    {
        return $this->status === 'investigated';
    }

    /**
     * Assign investigator to the report
     */
    public function assignInvestigator(User $investigator): bool
    {
        if ($this->canBeInvestigated()) {
            $this->investigated_by = $investigator->id;
            $this->status = 'investigating';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Complete investigation
     */
    public function completeInvestigation(string $notes, string $actionTaken = null): bool
    {
        if ($this->status === 'investigating' || $this->status === 'reported') {
            $this->investigation_notes = $notes;
            $this->action_taken = $actionTaken;
            $this->investigated_at = now();
            $this->status = 'investigated';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Approve the damage report and write off
     */
    public function approve(): bool
    {
        if ($this->canBeApproved()) {
            $this->status = 'approved';
            
            // Create stock adjustment transaction for write-off
            $this->createWriteOffTransaction();
            
            return $this->save();
        }
        
        return false;
    }

    /**
     * Write off the damaged inventory
     */
    public function writeOff(): bool
    {
        if ($this->status === 'approved') {
            $this->status = 'written_off';
            $this->createWriteOffTransaction();
            return $this->save();
        }
        
        return false;
    }

    /**
     * Create stock transaction for write-off
     */
    protected function createWriteOffTransaction(): void
    {
        StockTransaction::create([
            'product_id' => $this->product_id,
            'batch_id' => $this->batch_id,
            'user_id' => $this->investigated_by ?? $this->reported_by,
            'type' => 'adjustment',
            'quantity' => $this->quantity_damaged,
            'quantity_before' => $this->batch?->quantity ?? $this->product->quantity,
            'quantity_after' => ($this->batch?->quantity ?? $this->product->quantity) - $this->quantity_damaged,
            'reference_type' => 'damage_report',
            'reference_id' => $this->id,
            'notes' => "Write-off due to damage: {$this->damage_type->getDisplayName()}",
        ]);

        // Update batch/product quantities
        if ($this->batch) {
            $this->batch->reduceQuantity($this->quantity_damaged);
        }
        
        $this->product->updateStock($this->quantity_damaged, 'subtract');
    }

    /**
     * Calculate estimated value if not provided
     */
    public function calculateEstimatedValue(): void
    {
        if (!$this->estimated_value) {
            $unitPrice = $this->batch?->unit_cost ?? $this->product->unit_price;
            $this->estimated_value = $this->quantity_damaged * $unitPrice;
        }
    }

    /**
     * Get days since reported
     */
    public function getDaysSinceReportedAttribute(): int
    {
        return $this->reported_at->diffInDays(now());
    }

    /**
     * Check if report is overdue for investigation
     */
    public function isOverdueForInvestigation(): bool
    {
        return $this->status === 'reported' && $this->days_since_reported > 7;
    }

    /**
     * Scope: By status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Reported damages
     */
    public function scopeReported($query)
    {
        return $query->where('status', 'reported');
    }

    /**
     * Scope: Under investigation
     */
    public function scopeInvestigating($query)
    {
        return $query->where('status', 'investigating');
    }

    /**
     * Scope: Investigated damages
     */
    public function scopeInvestigated($query)
    {
        return $query->where('status', 'investigated');
    }

    /**
     * Scope: Approved damages
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope: Written off damages
     */
    public function scopeWrittenOff($query)
    {
        return $query->where('status', 'written_off');
    }

    /**
     * Scope: By damage type
     */
    public function scopeByDamageType($query, DamageType $damageType)
    {
        return $query->where('damage_type', $damageType->value);
    }

    /**
     * Scope: Recent reports
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('reported_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Overdue for investigation
     */
    public function scopeOverdueInvestigation($query, int $days = 7)
    {
        return $query->where('status', 'reported')
                    ->where('reported_at', '<', now()->subDays($days));
    }

    /**
     * Boot method to set defaults
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($report) {
            if (!$report->reported_at) {
                $report->reported_at = now();
            }
            
            if (!$report->status) {
                $report->status = 'reported';
            }
        });

        static::saving(function ($report) {
            $report->calculateEstimatedValue();
        });
    }

    /**
     * Get damage summary statistics
     */
    public static function getDamageSummary(int $days = 30): array
    {
        $reports = static::recent($days)->get();
        
        return [
            'total_reports' => $reports->count(),
            'total_quantity' => $reports->sum('quantity_damaged'),
            'total_value' => $reports->sum('estimated_value'),
            'by_type' => $reports->groupBy('damage_type')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'quantity' => $group->sum('quantity_damaged'),
                    'value' => $group->sum('estimated_value'),
                ];
            }),
            'by_status' => $reports->groupBy('status')->map->count(),
            'average_investigation_time' => $reports->whereNotNull('investigated_at')
                ->map(function ($report) {
                    return $report->reported_at->diffInDays($report->investigated_at);
                })->avg(),
        ];
    }
}