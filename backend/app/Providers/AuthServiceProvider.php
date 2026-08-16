<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Support\Enums\UserRole;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        \App\Models\User::class => \App\Modules\UserManagement\Policies\UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        // Define role-based gates
        Gate::define('warehouse-access', function (User $user) {
            return in_array($user->role, [UserRole::WAREHOUSE, UserRole::INVENTORY_STAFF, UserRole::MANAGER]);
        });

        Gate::define('inventory-access', function (User $user) {
            return in_array($user->role, [UserRole::INVENTORY_STAFF, UserRole::MANAGER]);
        });

        Gate::define('manager-access', function (User $user) {
            return $user->role === UserRole::MANAGER;
        });
    }
}