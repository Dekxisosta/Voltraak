<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\UserManagement\Models\User;

class DiscrepancyReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'batch_id',
        'type',
        'expected_quantity',
        'actual_quantity',
        'description',
        'status',
        'reported_by',
        'assigned_to',
        'reported_at',
        'resolved_at',
        'investigation_notes',
        'resolution_notes',
        'root_cause',
    ];

    protected $casts = [
        'expected_quantity' => 'integer',
        'actual_quantity' => 'integer',
        'reported_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    /**
     * Get the product this discrepancy is for
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the batch this discrepancy is for
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * Get the user who reported the discrepancy
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the user assigned to investigate
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get discrepancy (computed attribute)
     */
    public function getDiscrepancyAttribute(): int
    {
        return $this->actual_quantity - $this->expected_quantity;
    }

    /**
     * Get discrepancy percentage
     */
    public function getDiscrepancyPercentageAttribute(): float
    {
        if ($this->expected_quantity === 0) {
            return $this->actual_quantity > 0 ? 100 : 0;
        }
        
        return (abs($this->discrepancy) / $this->expected_quantity) * 100;
    }

    /**
     * Check if this is a shortage
     */
    public function isShortage(): bool
    {
        return $this->discrepancy < 0;
    }

    /**
     * Check if this is an overage
     */
    public function isOverage(): bool
    {
        return $this->discrepancy > 0;
    }

    /**
     * Get severity level
     */
    public function getSeverityAttribute(): string
    {
        $percentage = $this->discrepancy_percentage;
        
        return match(true) {
            $percentage >= 50 => 'critical',
            $percentage >= 20 => 'high',
            $percentage >= 10 => 'medium',
            default => 'low',
        };
    }

    /**
     * Assign to user for investigation
     */
    public function assignTo(User $user): bool
    {
        if ($this->status === 'open') {
            $this->assigned_to = $user->id;
            $this->status = 'investigating';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Add investigation notes
     */
    public function addInvestigationNotes(string $notes): bool
    {
        $this->investigation_notes = $notes;
        return $this->save();
    }

    /**
     * Resolve the discrepancy
     */
    public function resolve(string $resolutionNotes, string $rootCause = null): bool
    {
        if (in_array($this->status, ['open', 'investigating'])) {
            $this->status = 'resolved';
            $this->resolution_notes = $resolutionNotes;
            $this->root_cause = $rootCause;
            $this->resolved_at = now();
            
            // Create corrective stock transaction if needed
            if ($this->discrepancy !== 0) {
                $this->createCorrectionTransaction();
            }
            
            return $this->save();
        }
        
        return false;
    }

    /**
     * Close the discrepancy report
     */
    public function close(): bool
    {
        if ($this->status === 'resolved') {
            $this->status = 'closed';
            return $this->save();
        }
        
        return false;
    }

    /**
     * Reopen the discrepancy
     */
    public function reopen(): bool
    {
        if ($this->status === 'closed') {
            $this->status = 'investigating';
            $this->resolved_at = null;
            return $this->save();
        }
        
        return false;
    }

    /**
     * Create correction stock transaction
     */
    protected function createCorrectionTransaction(): void
    {
        $correctionQuantity = abs($this->discrepancy);
        $transactionType = $this->discrepancy > 0 ? 'in' : 'adjustment';
        
        StockTransaction::create([
            'product_id' => $this->product_id,
            'batch_id' => $this->batch_id,
            'user_id' => $this->assigned_to ?? $this->reported_by,
            'type' => $transactionType,
            'quantity' => $correctionQuantity,
            'quantity_before' => $this->expected_quantity,
            'quantity_after' => $this->actual_quantity,
            'reference_type' => 'discrepancy_report',
            'reference_id' => $this->id,
            'notes' => "Correction for {$this->type} discrepancy: {$this->description}",
        ]);

        // Update quantities to match actual
        if ($this->batch) {
            $this->batch->quantity = $this->actual_quantity;
            $this->batch->save();
        } else {
            $this->product->quantity = $this->actual_quantity;
            $this->product->save();
        }
    }

    /**
     * Get resolution time in hours
     */
    public function getResolutionTimeAttribute(): ?float
    {
        if (!$this->resolved_at) {
            return null;
        }
        
        return $this->reported_at->diffInHours($this->resolved_at);
    }

    /**
     * Check if overdue for resolution
     */
    public function isOverdue(): bool
    {
        $hoursLimit = match($this->severity) {
            'critical' => 4,
            'high' => 24,
            'medium' => 72,
            default => 168, // 1 week
        };
        
        return $this->status !== 'resolved' && 
               $this->reported_at->addHours($hoursLimit)->isPast();
    }

    /**
     * Scope: By type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: By status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Open discrepancies
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope: Under investigation
     */
    public function scopeInvestigating($query)
    {
        return $query->where('status', 'investigating');
    }

    /**
     * Scope: Resolved discrepancies
     */
    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    /**
     * Scope: Closed discrepancies
     */
    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    /**
     * Scope: By severity
     */
    public function scopeBySeverity($query, string $severity)
    {
        // This is complex to do in SQL, so we'll use a workaround
        return $query->get()->filter(function ($report) use ($severity) {
            return $report->severity === $severity;
        });
    }

    /**
     * Scope: Overdue discrepancies
     */
    public function scopeOverdue($query)
    {
        return $query->whereIn('status', ['open', 'investigating'])
                    ->where('reported_at', '<', now()->subHours(24));
    }

    /**
     * Scope: Recent discrepancies
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('reported_at', '>=', now()->subDays($days));
    }

    /**
     * Scope: Shortages only
     */
    public function scopeShortages($query)
    {
        return $query->whereRaw('actual_quantity < expected_quantity');
    }

    /**
     * Scope: Overages only
     */
    public function scopeOverages($query)
    {
        return $query->whereRaw('actual_quantity > expected_quantity');
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
                $report->status = 'open';
            }
        });
    }

    /**
     * Get discrepancy summary statistics
     */
    public static function getDiscrepancySummary(int $days = 30): array
    {
        $reports = static::recent($days)->get();
        
        return [
            'total_reports' => $reports->count(),
            'open_reports' => $reports->where('status', 'open')->count(),
            'investigating' => $reports->where('status', 'investigating')->count(),
            'resolved' => $reports->where('status', 'resolved')->count(),
            'shortages' => $reports->filter->isShortage()->count(),
            'overages' => $reports->filter->isOverage()->count(),
            'by_type' => $reports->groupBy('type')->map->count(),
            'by_severity' => $reports->groupBy('severity')->map->count(),
            'average_resolution_time' => $reports->whereNotNull('resolved_at')
                ->map->resolution_time
                ->avg(),
            'overdue_count' => $reports->filter->isOverdue()->count(),
        ];
    }
}