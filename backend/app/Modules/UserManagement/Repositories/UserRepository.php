<?php

namespace App\Modules\UserManagement\Repositories;

use App\Models\User;
use App\Support\Enums\UserRole;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserRepository
{
    /**
     * Get users with advanced filtering and relationships.
     */
    public function getUsers(array $filters = [], int $perPage = 15, array $with = []): LengthAwarePaginator
    {
        $query = User::query();

        // Eager load relationships if specified
        if (!empty($with)) {
            $query->with($with);
        }

        // Apply filters
        $this->applyFilters($query, $filters);

        // Apply sorting
        $this->applySorting($query, $filters);

        return $query->paginate($perPage);
    }

    /**
     * Find user by ID with optional relationships.
     */
    public function findById(int $id, array $with = []): ?User
    {
        $query = User::query();

        if (!empty($with)) {
            $query->with($with);
        }

        return $query->find($id);
    }

    /**
     * Find user by email.
     */
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * Get active users by role.
     */
    public function getActiveUsersByRole(UserRole $role): Collection
    {
        return User::active()
            ->byRole($role)
            ->orderBy('name')
            ->get();
    }

    /**
     * Get users requiring attention.
     */
    public function getUsersRequiringAttention(): Collection
    {
        return User::where(function($query) {
            $query->where('is_active', false)
                  ->orWhereNull('email_verified_at')
                  ->orWhere('last_login_at', '<', now()->subDays(30))
                  ->orWhereNull('last_login_at');
        })->with(['stockTransactions' => function($q) {
            $q->latest()->limit(1);
        }, 'physicalCounts' => function($q) {
            $q->latest()->limit(1);
        }])->get();
    }

    /**
     * Get user statistics grouped by various dimensions.
     */
    public function getUserStatistics(): array
    {
        $baseStats = [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'inactive_users' => User::where('is_active', false)->count(),
            'unverified_users' => User::whereNull('email_verified_at')->count(),
        ];

        $roleStats = User::selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->get()
            ->pluck('count', 'role')
            ->toArray();

        $activityStats = [
            'recent_logins' => User::where('last_login_at', '>=', now()->subDays(7))->count(),
            'users_needing_attention' => $this->getUsersRequiringAttention()->count(),
        ];

        $departmentStats = User::selectRaw('department, COUNT(*) as count')
            ->whereNotNull('department')
            ->groupBy('department')
            ->orderByDesc('count')
            ->get()
            ->pluck('count', 'department')
            ->toArray();

        return [
            ...$baseStats,
            'by_role' => $roleStats,
            'by_department' => $departmentStats,
            ...$activityStats
        ];
    }

    /**
     * Get users with their activity metrics.
     */
    public function getUsersWithActivityMetrics(int $days = 30): Collection
    {
        $startDate = now()->subDays($days);

        return User::with([
            'stockTransactions' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            },
            'physicalCounts' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            },
            'purchaseOrders' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            },
            'procurementRequests' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }
        ])->get();
    }

    /**
     * Search users by name or email.
     */
    public function searchUsers(string $search, int $limit = 20): Collection
    {
        return User::where(function($query) use ($search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        })
        ->active()
        ->orderBy('name')
        ->limit($limit)
        ->get();
    }

    /**
     * Get users by department with activity counts.
     */
    public function getUsersByDepartment(string $department): Collection
    {
        return User::where('department', 'like', "%{$department}%")
            ->with(['stockTransactions' => function($q) {
                $q->where('created_at', '>=', now()->subDays(30));
            }])
            ->orderBy('name')
            ->get();
    }

    /**
     * Get top performing users based on activity metrics.
     */
    public function getTopPerformers(int $days = 30, int $limit = 10): Collection
    {
        $startDate = now()->subDays($days);

        return User::withCount([
            'stockTransactions as transaction_count' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            },
            'physicalCounts as count_count' => function($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }
        ])
        ->having('transaction_count', '>', 0)
        ->orHaving('count_count', '>', 0)
        ->orderByDesc('transaction_count')
        ->orderByDesc('count_count')
        ->limit($limit)
        ->get();
    }

    /**
     * Check if user has any relationships that prevent deletion.
     */
    public function hasPreventingRelationships(User $user): array
    {
        $relationships = [];

        if ($user->stockTransactions()->exists()) {
            $relationships[] = 'stock_transactions';
        }

        if ($user->physicalCounts()->exists()) {
            $relationships[] = 'physical_counts';
        }

        if ($user->purchaseOrders()->exists()) {
            $relationships[] = 'purchase_orders';
        }

        if ($user->procurementRequests()->exists()) {
            $relationships[] = 'procurement_requests';
        }

        return $relationships;
    }

    /**
     * Get user login history (if stored separately).
     */
    public function getUserLoginHistory(int $userId, int $limit = 50): array
    {
        // This would require a separate login_logs table for full history
        // For now, return basic info from the user record
        $user = $this->findById($userId);
        
        return [
            'last_login' => $user?->last_login_at,
            'login_count' => 1, // Placeholder - would need actual tracking
            'recent_logins' => [] // Placeholder - would need login_logs table
        ];
    }

    /**
     * Apply filters to the query.
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['role'])) {
            if (is_array($filters['role'])) {
                $query->whereIn('role', $filters['role']);
            } else {
                $query->where('role', UserRole::from($filters['role']));
            }
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        if (!empty($filters['department'])) {
            $query->where('department', 'like', '%' . $filters['department'] . '%');
        }

        if (!empty($filters['search'])) {
            $query->where(function($q) use ($filters) {
                $q->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('email', 'like', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['created_after'])) {
            $query->where('created_at', '>=', $filters['created_after']);
        }

        if (!empty($filters['last_login_after'])) {
            $query->where('last_login_at', '>=', $filters['last_login_after']);
        }

        if (!empty($filters['needs_attention'])) {
            $query->where(function($q) {
                $q->where('is_active', false)
                  ->orWhereNull('email_verified_at')
                  ->orWhere('last_login_at', '<', now()->subDays(14))
                  ->orWhereNull('last_login_at');
            });
        }
    }

    /**
     * Apply sorting to the query.
     */
    private function applySorting(Builder $query, array $filters): void
    {
        $sortField = $filters['sort_by'] ?? 'name';
        $sortDirection = $filters['sort_direction'] ?? 'asc';

        // Validate sort fields
        $allowedSortFields = [
            'name', 'email', 'role', 'department', 
            'is_active', 'created_at', 'last_login_at'
        ];

        if (in_array($sortField, $allowedSortFields)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('name', 'asc');
        }

        // Secondary sort by ID for consistency
        if ($sortField !== 'id') {
            $query->orderBy('id', 'asc');
        }
    }
}