<?php

namespace App\Modules\UserManagement\Policies;

use App\Models\User;
use App\Support\Enums\UserRole;

class UserPolicy
{
    /**
     * Determine if the given user can view any users.
     */
    public function viewAny(User $user): bool
    {
        // Only managers can view user lists
        return $user->isManager();
    }

    /**
     * Determine if the given user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Users can view their own profile, managers can view anyone
        return $user->id === $model->id || $user->isManager();
    }

    /**
     * Determine if the given user can create users.
     */
    public function create(User $user): bool
    {
        // Only managers can create users
        return $user->isManager();
    }

    /**
     * Determine if the given user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // Users can update their own profile (limited fields)
        if ($user->id === $model->id) {
            return true;
        }

        // Managers can update subordinates, but not other managers
        return $user->isManager() && $model->role !== UserRole::MANAGER;
    }

    /**
     * Determine if the given user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Cannot delete self
        if ($user->id === $model->id) {
            return false;
        }

        // Only managers can delete users, and only subordinates
        return $user->isManager() && $model->role !== UserRole::MANAGER;
    }

    /**
     * Determine if the given user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        // Same rules as delete
        return $this->delete($user, $model);
    }

    /**
     * Determine if the given user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        // Only system administrators can force delete (not implemented yet)
        return false;
    }

    /**
     * Determine if the given user can change another user's role.
     */
    public function changeRole(User $user, User $model, UserRole $newRole): bool
    {
        // Cannot change own role
        if ($user->id === $model->id) {
            return false;
        }

        // Only managers can change roles
        if (!$user->isManager()) {
            return false;
        }

        // Cannot assign manager role or change existing manager's role
        return $newRole !== UserRole::MANAGER && $model->role !== UserRole::MANAGER;
    }

    /**
     * Determine if the given user can reset another user's password.
     */
    public function resetPassword(User $user, User $model): bool
    {
        // Cannot reset own password using admin function
        if ($user->id === $model->id) {
            return false;
        }

        // Only managers can reset passwords, and only for subordinates
        return $user->isManager() && $model->role !== UserRole::MANAGER;
    }

    /**
     * Determine if the given user can toggle another user's status.
     */
    public function toggleStatus(User $user, User $model): bool
    {
        // Cannot toggle own status
        if ($user->id === $model->id) {
            return false;
        }

        // Only managers can toggle status, and only for subordinates
        return $user->isManager() && $model->role !== UserRole::MANAGER;
    }

    /**
     * Determine if the given user can view user statistics.
     */
    public function viewStatistics(User $user): bool
    {
        // Only managers can view user statistics
        return $user->isManager();
    }

    /**
     * Determine if the given user can perform bulk operations.
     */
    public function bulkUpdate(User $user): bool
    {
        // Only managers can perform bulk operations
        return $user->isManager();
    }

    /**
     * Determine if the given user can view activity reports for other users.
     */
    public function viewActivityReport(User $user, User $model): bool
    {
        // Users can view their own reports, managers can view anyone's
        return $user->id === $model->id || $user->isManager();
    }
}