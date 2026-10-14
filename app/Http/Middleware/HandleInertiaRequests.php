<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user
                    ? app(\App\Modules\UserManagement\Services\AuthService::class)->formatUserData($user)
                    : null,
                'permissions' => $user
                    ? $this->getUserPermissions($user)
                    : [],
            ],
        ];
    }

    /**
     * Get user permissions for the frontend
     */
    private function getUserPermissions($user): array
    {
        if (!$user) return [];

        // For admin/manager roles, grant all permissions
        if (in_array($user->role->value, ['admin', 'manager'])) {
            return [
                'view_dashboard',
                'manage_inventory',
                'manage_warehouse',
                'manage_users',
                'view_reports',
                'approve_orders',
                'manage_products',
                'view_analytics'
            ];
        }

        // Role-based permissions for other roles
        return match ($user->role->value) {
            'inventory_staff' => [
                'view_dashboard',
                'manage_inventory',
                'view_reports',
                'manage_products'
            ],
            'warehouse' => [
                'view_dashboard',
                'manage_warehouse',
                'view_reports'
            ],
            default => ['view_dashboard']
        };
    }
}
