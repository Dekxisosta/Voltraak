<?php

namespace App\Modules\UserManagement\Services;

use App\Models\User;
use App\Core\Logging\ActivityLogger;
use App\Core\Exceptions\ValidationException;
use App\Core\Exceptions\ResourceNotFoundException;
use App\Support\Enums\UserRole;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class UserService
{
    public function __construct(
        private ActivityLogger $activityLogger
    ) {}

    /**
     * Get all users with filtering and pagination.
     */
    public function getUsers(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = User::query();

        // Apply filters
        if (!empty($filters['role'])) {
            $query->where('role', UserRole::from($filters['role']));
        }

        if (!empty($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
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

        // Apply sorting
        $sortField = $filters['sort_by'] ?? 'name';
        $sortDirection = $filters['sort_direction'] ?? 'asc';
        $query->orderBy($sortField, $sortDirection);

        return $query->paginate($perPage);
    }

    /**
     * Get user by ID.
     */
    public function getUserById(int $id): User
    {
        $user = User::find($id);
        
        if (!$user) {
            throw new ResourceNotFoundException('User not found');
        }

        return $user;
    }

    /**
     * Create a new user.
     */
    public function createUser(array $data): User
    {
        $currentUser = Auth::user();
        
        // Validate role assignment permissions
        if (!$this->canManageUser($currentUser, $data['role'])) {
            throw new ValidationException('You do not have permission to create users with this role');
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => UserRole::from($data['role']),
            'phone' => $data['phone'] ?? null,
            'department' => $data['department'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $this->activityLogger->logActivity(
            $currentUser->id,
            'user.created',
            'User created',
            [
                'created_user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role->value
            ]
        );

        return $user;
    }

    /**
     * Update user information.
     */
    public function updateUser(int $id, array $data): User
    {
        $user = $this->getUserById($id);
        $currentUser = Auth::user();

        // Validate update permissions
        if (!$this->canUpdateUser($currentUser, $user, $data)) {
            throw new ValidationException('You do not have permission to update this user');
        }

        $originalData = $user->toArray();

        // Handle password update separately
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        // Handle role changes
        if (isset($data['role'])) {
            if (!$this->canManageUser($currentUser, $data['role'])) {
                throw new ValidationException('You do not have permission to assign this role');
            }
            $data['role'] = UserRole::from($data['role']);
        }

        $user->update(array_filter($data, fn($value) => $value !== null));

        $this->logUserChanges($currentUser, $user, $originalData, $user->fresh()->toArray());

        return $user->fresh();
    }

    /**
     * Toggle user active status.
     */
    public function toggleUserStatus(int $id): User
    {
        $user = $this->getUserById($id);
        $currentUser = Auth::user();

        if (!$this->canManageUser($currentUser, $user->role->value)) {
            throw new ValidationException('You do not have permission to modify this user');
        }

        $newStatus = !$user->is_active;
        $user->update(['is_active' => $newStatus]);

        $this->activityLogger->logActivity(
            $currentUser->id,
            'user.status_changed',
            'User status changed',
            [
                'target_user_id' => $user->id,
                'old_status' => !$newStatus,
                'new_status' => $newStatus
            ]
        );

        // Revoke all tokens if deactivating
        if (!$newStatus) {
            $user->revokeAllTokens();
        }

        return $user;
    }

    /**
     * Delete user (soft delete).
     */
    public function deleteUser(int $id): bool
    {
        $user = $this->getUserById($id);
        $currentUser = Auth::user();

        if (!$this->canManageUser($currentUser, $user->role->value)) {
            throw new ValidationException('You do not have permission to delete this user');
        }

        if ($user->id === $currentUser->id) {
            throw new ValidationException('You cannot delete your own account');
        }

        // Check for existing relationships that prevent deletion
        $relationshipChecks = $this->checkUserRelationships($user);
        if (!empty($relationshipChecks)) {
            throw new ValidationException(
                'Cannot delete user with existing records: ' . implode(', ', $relationshipChecks)
            );
        }

        $user->revokeAllTokens();
        $user->delete();

        $this->activityLogger->logActivity(
            $currentUser->id,
            'user.deleted',
            'User deleted',
            [
                'deleted_user_id' => $user->id,
                'deleted_user_email' => $user->email
            ]
        );

        return true;
    }

    /**
     * Get user statistics and analytics.
     */
    public function getUserStatistics(): array
    {
        return User::getStatistics();
    }

    /**
     * Get users requiring attention.
     */
    public function getUsersRequiringAttention(): Collection
    {
        return User::getUsersRequiringAttention();
    }

    /**
     * Reset user password (admin function).
     */
    public function resetUserPassword(int $id, string $newPassword): User
    {
        $user = $this->getUserById($id);
        $currentUser = Auth::user();

        if (!$this->canManageUser($currentUser, $user->role->value)) {
            throw new ValidationException('You do not have permission to reset this user\'s password');
        }

        $user->update(['password' => Hash::make($newPassword)]);
        $user->revokeAllTokens(); // Force re-authentication

        $this->activityLogger->logActivity(
            $currentUser->id,
            'user.password_reset',
            'User password reset by admin',
            ['target_user_id' => $user->id]
        );

        return $user;
    }

    /**
     * Bulk update users.
     */
    public function bulkUpdateUsers(array $userIds, array $updates): array
    {
        $currentUser = Auth::user();
        $results = [];

        foreach ($userIds as $userId) {
            try {
                $user = $this->getUserById($userId);
                
                if (!$this->canUpdateUser($currentUser, $user, $updates)) {
                    $results[] = ['id' => $userId, 'success' => false, 'error' => 'Permission denied'];
                    continue;
                }

                $this->updateUser($userId, $updates);
                $results[] = ['id' => $userId, 'success' => true];
                
            } catch (\Exception $e) {
                $results[] = ['id' => $userId, 'success' => false, 'error' => $e->getMessage()];
            }
        }

        $this->activityLogger->logActivity(
            $currentUser->id,
            'user.bulk_update',
            'Bulk user update performed',
            [
                'user_ids' => $userIds,
                'updates' => $updates,
                'results' => $results
            ]
        );

        return $results;
    }

    /**
     * Get user activity report.
     */
    public function getUserActivityReport(int $id, int $days = 30): array
    {
        $user = $this->getUserById($id);
        
        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value
            ],
            'period' => "{$days} days",
            'activity_summary' => $user->getRecentActivitySummary($days),
            'performance_metrics' => $user->getPerformanceMetrics(),
            'attention_items' => $user->needsAttention()
        ];
    }

    /**
     * Check if current user can manage target user.
     */
    private function canManageUser(?User $currentUser, string $targetRole): bool
    {
        if (!$currentUser || !$currentUser->isManager()) {
            return false;
        }

        $targetRoleEnum = UserRole::from($targetRole);
        
        // Managers can manage warehouse and inventory staff, but not other managers
        return $targetRoleEnum !== UserRole::MANAGER;
    }

    /**
     * Check if current user can update target user.
     */
    private function canUpdateUser(?User $currentUser, User $targetUser, array $updates): bool
    {
        if (!$currentUser) {
            return false;
        }

        // Users can update their own profile (limited fields)
        if ($currentUser->id === $targetUser->id) {
            $allowedSelfUpdates = ['name', 'email', 'phone', 'password'];
            $updateKeys = array_keys($updates);
            
            return empty(array_diff($updateKeys, $allowedSelfUpdates));
        }

        // Managers can update subordinates
        return $this->canManageUser($currentUser, $targetUser->role->value);
    }

    /**
     * Check user relationships that prevent deletion.
     */
    private function checkUserRelationships(User $user): array
    {
        $issues = [];

        if ($user->stockTransactions()->count() > 0) {
            $issues[] = 'Stock transactions';
        }

        if ($user->physicalCounts()->count() > 0) {
            $issues[] = 'Physical counts';
        }

        if ($user->purchaseOrders()->count() > 0) {
            $issues[] = 'Purchase orders';
        }

        if ($user->procurementRequests()->count() > 0) {
            $issues[] = 'Procurement requests';
        }

        return $issues;
    }

    /**
     * Log user changes for audit trail.
     */
    private function logUserChanges(User $currentUser, User $targetUser, array $originalData, array $newData): void
    {
        $changes = [];
        
        foreach ($newData as $field => $newValue) {
            $oldValue = $originalData[$field] ?? null;
            
            if ($oldValue !== $newValue) {
                $changes[$field] = [
                    'old' => $field === 'password' ? '[HIDDEN]' : $oldValue,
                    'new' => $field === 'password' ? '[HIDDEN]' : $newValue
                ];
            }
        }

        if (!empty($changes)) {
            $this->activityLogger->logActivity(
                $currentUser->id,
                'user.updated',
                'User information updated',
                [
                    'target_user_id' => $targetUser->id,
                    'changes' => $changes
                ]
            );
        }
    }
}