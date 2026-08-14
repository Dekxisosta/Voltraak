<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Support\Enums\UserRole;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'department',
        'is_active',
        'last_login_at',
        'email_verified_at'
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'is_active' => 'boolean',
        'last_login_at' => 'datetime'
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the stock transactions created by this user.
     */
    public function stockTransactions(): HasMany
    {
        return $this->hasMany(\App\Modules\Inventory\Models\StockTransaction::class);
    }

    /**
     * Get the physical counts performed by this user.
     */
    public function physicalCounts(): HasMany
    {
        return $this->hasMany(\App\Modules\Inventory\Models\PhysicalCount::class);
    }

    /**
     * Get the purchase orders created by this user.
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(\App\Modules\Procurement\Models\PurchaseOrder::class);
    }

    /**
     * Get the procurement requests created by this user.
     */
    public function procurementRequests(): HasMany
    {
        return $this->hasMany(\App\Modules\Procurement\Models\ProcurementRequest::class);
    }

    /**
     * Get the procurement requests approved by this user.
     */
    public function approvedProcurementRequests(): HasMany
    {
        return $this->hasMany(\App\Modules\Procurement\Models\ProcurementRequest::class, 'approved_by');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to get active users only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get users by role.
     */
    public function scopeByRole($query, UserRole $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope to get warehouse staff.
     */
    public function scopeWarehouseStaff($query)
    {
        return $query->where('role', UserRole::WAREHOUSE);
    }

    /**
     * Scope to get inventory staff.
     */
    public function scopeInventoryStaff($query)
    {
        return $query->where('role', UserRole::INVENTORY_STAFF);
    }

    /**
     * Scope to get managers.
     */
    public function scopeManagers($query)
    {
        return $query->where('role', UserRole::MANAGER);
    }

    /*
    |--------------------------------------------------------------------------
    | Permission Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if user has permission for a specific action.
     */
    public function hasPermission(string $permission): bool
    {
        return app(\App\Core\Permissions\PermissionService::class)
            ->hasPermission($this, $permission);
    }

    /**
     * Check if user can perform action on resource.
     */
    public function can($ability, $arguments = [])
    {
        // First check Laravel's built-in authorization
        $result = parent::can($ability, $arguments);
        
        // If Laravel authorization passes, also check our permission system
        if ($result) {
            return $this->hasPermission($ability);
        }
        
        return $result;
    }

    /**
     * Check if user is a manager or higher.
     */
    public function isManager(): bool
    {
        return $this->role === UserRole::MANAGER;
    }

    /**
     * Check if user is inventory staff or higher.
     */
    public function isInventoryStaff(): bool
    {
        return in_array($this->role, [UserRole::INVENTORY_STAFF, UserRole::MANAGER]);
    }

    /**
     * Check if user is warehouse staff or higher.
     */
    public function isWarehouseStaff(): bool
    {
        return in_array($this->role, [UserRole::WAREHOUSE, UserRole::INVENTORY_STAFF, UserRole::MANAGER]);
    }

    /*
    |--------------------------------------------------------------------------
    | Profile & Activity Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Update last login timestamp.
     */
    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Get user's recent activity summary.
     */
    public function getRecentActivitySummary(int $days = 7): array
    {
        $startDate = now()->subDays($days);
        
        return [
            'stock_transactions' => $this->stockTransactions()
                ->where('created_at', '>=', $startDate)
                ->count(),
            'physical_counts' => $this->physicalCounts()
                ->where('created_at', '>=', $startDate)
                ->count(),
            'purchase_orders' => $this->purchaseOrders()
                ->where('created_at', '>=', $startDate)
                ->count(),
            'procurement_requests' => $this->procurementRequests()
                ->where('created_at', '>=', $startDate)
                ->count()
        ];
    }

    /**
     * Get user's performance metrics.
     */
    public function getPerformanceMetrics(): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        
        // Transaction accuracy for inventory staff
        $transactionAccuracy = null;
        if ($this->isWarehouseStaff()) {
            $totalTransactions = $this->stockTransactions()
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->count();
                
            // This would need more sophisticated tracking to measure actual accuracy
            $transactionAccuracy = $totalTransactions > 0 ? 95.0 : null; // Placeholder
        }
        
        // Physical count accuracy
        $countAccuracy = null;
        if ($this->isInventoryStaff()) {
            $physicalCounts = $this->physicalCounts()
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->get();
                
            if ($physicalCounts->isNotEmpty()) {
                $accurateCounts = $physicalCounts->filter(function ($count) {
                    return abs($count->variance_percentage) <= 5; // 5% tolerance
                });
                
                $countAccuracy = ($accurateCounts->count() / $physicalCounts->count()) * 100;
            }
        }
        
        return [
            'transaction_accuracy' => $transactionAccuracy,
            'count_accuracy' => $countAccuracy,
            'activity_level' => $this->calculateActivityLevel(),
            'last_activity' => $this->getLastActivityDate()
        ];
    }

    /**
     * Calculate user activity level.
     */
    private function calculateActivityLevel(): string
    {
        $recentActivity = $this->getRecentActivitySummary(7);
        $totalActivity = array_sum($recentActivity);
        
        return match(true) {
            $totalActivity >= 50 => 'very_high',
            $totalActivity >= 25 => 'high',
            $totalActivity >= 10 => 'medium',
            $totalActivity >= 1 => 'low',
            default => 'inactive'
        };
    }

    /**
     * Get last activity date across all modules.
     */
    private function getLastActivityDate(): ?\Carbon\Carbon
    {
        $lastTransactionDate = $this->stockTransactions()->latest()->value('created_at');
        $lastCountDate = $this->physicalCounts()->latest()->value('created_at');
        $lastPODate = $this->purchaseOrders()->latest()->value('created_at');
        $lastRequestDate = $this->procurementRequests()->latest()->value('created_at');
        
        $dates = collect([$lastTransactionDate, $lastCountDate, $lastPODate, $lastRequestDate])
            ->filter()
            ->map(fn($date) => \Carbon\Carbon::parse($date));
            
        return $dates->isNotEmpty() ? $dates->max() : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Security Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Check if account is locked or suspended.
     */
    public function isAccountLocked(): bool
    {
        return !$this->is_active;
    }

    /**
     * Generate a secure API token for the user.
     */
    public function generateApiToken(string $name = 'api-token', array $abilities = ['*']): string
    {
        // Revoke existing tokens for this name
        $this->tokens()->where('name', $name)->delete();
        
        // Create new token
        $token = $this->createToken($name, $abilities);
        
        return $token->plainTextToken;
    }

    /**
     * Revoke all API tokens for user.
     */
    public function revokeAllTokens(): void
    {
        $this->tokens()->delete();
    }

    /*
    |--------------------------------------------------------------------------
    | Utility Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get user's full name or email if no name.
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: $this->email;
    }

    /**
     * Get user's initials.
     */
    public function getInitialsAttribute(): string
    {
        $nameParts = explode(' ', $this->name ?: $this->email);
        $initials = '';
        
        foreach (array_slice($nameParts, 0, 2) as $part) {
            $initials .= strtoupper(substr($part, 0, 1));
        }
        
        return $initials ?: 'U';
    }

    /**
     * Get user's role display name.
     */
    public function getRoleDisplayAttribute(): string
    {
        return match($this->role) {
            UserRole::WAREHOUSE => 'Warehouse Staff',
            UserRole::INVENTORY_STAFF => 'Inventory Staff',
            UserRole::MANAGER => 'Manager',
            default => 'Unknown'
        };
    }

    /**
     * Check if user account needs attention (inactive, no recent activity, etc.).
     */
    public function needsAttention(): array
    {
        $issues = [];
        
        if (!$this->is_active) {
            $issues[] = 'Account is inactive';
        }
        
        if (!$this->email_verified_at) {
            $issues[] = 'Email not verified';
        }
        
        $lastActivity = $this->getLastActivityDate();
        if (!$lastActivity || $lastActivity->diffInDays() > 30) {
            $issues[] = 'No recent activity (30+ days)';
        }
        
        if (!$this->last_login_at || $this->last_login_at->diffInDays() > 14) {
            $issues[] = 'No recent login (14+ days)';
        }
        
        return $issues;
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Get users requiring attention.
     */
    public static function getUsersRequiringAttention(): \Illuminate\Database\Eloquent\Collection
    {
        return static::where(function($query) {
            $query->where('is_active', false)
                  ->orWhereNull('email_verified_at')
                  ->orWhere('last_login_at', '<', now()->subDays(14))
                  ->orWhereNull('last_login_at');
        })->get();
    }

    /**
     * Get user statistics.
     */
    public static function getStatistics(): array
    {
        return [
            'total_users' => static::count(),
            'active_users' => static::where('is_active', true)->count(),
            'inactive_users' => static::where('is_active', false)->count(),
            'unverified_users' => static::whereNull('email_verified_at')->count(),
            'by_role' => [
                'warehouse' => static::where('role', UserRole::WAREHOUSE)->count(),
                'inventory_staff' => static::where('role', UserRole::INVENTORY_STAFF)->count(),
                'managers' => static::where('role', UserRole::MANAGER)->count(),
            ],
            'recent_logins' => static::where('last_login_at', '>=', now()->subDays(7))->count(),
            'users_needing_attention' => static::getUsersRequiringAttention()->count()
        ];
    }
}