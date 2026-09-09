<?php

namespace App\Core\Permissions;

use App\Modules\UserManagement\Models\User;
use App\Support\Enums\UserRole;

/**
 * Permission Service for role-based access control
 */
class PermissionService
{
    /**
     * Role hierarchy (higher roles inherit lower role permissions)
     */
    private const ROLE_HIERARCHY = [
        UserRole::WAREHOUSE->value => 1,
        UserRole::INVENTORY->value => 2,
        UserRole::MANAGER->value => 3,
    ];

    /**
     * Permission definitions per role
     */
    private const ROLE_PERMISSIONS = [
        UserRole::WAREHOUSE->value => [
            'view_products',
            'create_physical_counts',
            'create_discrepancy_reports',
            'view_fefo_recommendations',
            'receive_stock',
            'view_batches',
            'view_stock_transactions',
        ],
        UserRole::INVENTORY->value => [
            'manage_products',
            'manage_stock_transactions',
            'manage_reservations',
            'manage_batches',
            'create_damage_reports',
            'view_reports',
            'manage_customer_orders',
            'view_suppliers',
        ],
        UserRole::MANAGER->value => [
            'manage_users',
            'manage_suppliers',
            'approve_purchase_orders',
            'view_all_reports',
            'configure_reorder_points',
            'override_business_rules',
            'view_dashboard_kpis',
            'export_reports',
        ],
    ];

    /**
     * Check if user has specific permission
     */
    public function hasPermission(User $user, string $permission): bool
    {
        $userRole = UserRole::from($user->role);
        $userPermissions = $this->getUserPermissions($userRole);
        
        return in_array($permission, $userPermissions);
    }

    /**
     * Check if user has any of the given permissions
     */
    public function hasAnyPermission(User $user, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($user, $permission)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public function hasAllPermissions(User $user, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($user, $permission)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if user role has access to specific feature area
     */
    public function hasFeatureAccess(User $user, string $feature): bool
    {
        $userRole = UserRole::from($user->role);
        
        return match($feature) {
            'warehouse' => $userRole->hasAccess('warehouse'),
            'inventory' => $userRole->hasAccess('inventory'),
            'manager' => $userRole->hasAccess('manager'),
            'procurement' => $this->hasPermission($user, 'manage_suppliers') || 
                           $this->hasPermission($user, 'approve_purchase_orders'),
            'reporting' => $this->hasPermission($user, 'view_reports') || 
                          $this->hasPermission($user, 'view_all_reports'),
            default => false,
        };
    }

    /**
     * Get all permissions for a user role (including inherited permissions)
     */
    public function getUserPermissions(UserRole $role): array
    {
        $permissions = [];
        $roleLevel = self::ROLE_HIERARCHY[$role->value];

        // Collect permissions from current role and all lower roles
        foreach (self::ROLE_HIERARCHY as $roleName => $level) {
            if ($level <= $roleLevel) {
                $permissions = array_merge($permissions, self::ROLE_PERMISSIONS[$roleName]);
            }
        }

        return array_unique($permissions);
    }

    /**
     * Get all available permissions in the system
     */
    public function getAllPermissions(): array
    {
        $allPermissions = [];
        
        foreach (self::ROLE_PERMISSIONS as $permissions) {
            $allPermissions = array_merge($allPermissions, $permissions);
        }

        return array_unique($allPermissions);
    }

    /**
     * Check if user can access specific endpoint based on role
     */
    public function canAccessEndpoint(User $user, string $method, string $endpoint): bool
    {
        $userRole = UserRole::from($user->role);

        // Define endpoint access rules
        $endpointRules = [
            // User Management endpoints
            'GET:/users' => ['manage_users'],
            'POST:/users' => ['manage_users'],
            'PATCH:/users/*' => ['manage_users'],
            'DELETE:/users/*' => ['manage_users'],

            // Product endpoints
            'GET:/products' => ['view_products'],
            'POST:/products' => ['manage_products'],
            'PATCH:/products/*' => ['manage_products'],
            'DELETE:/products/*' => ['manage_products'],

            // Stock transaction endpoints
            'POST:/stock-in' => ['receive_stock', 'manage_stock_transactions'],
            'POST:/stock-out' => ['manage_stock_transactions'],
            'GET:/stock-transactions' => ['view_stock_transactions'],

            // Batch endpoints
            'GET:/batches' => ['view_batches'],
            'POST:/batches' => ['manage_batches'],
            'PATCH:/batches/*' => ['manage_batches'],

            // Physical count endpoints
            'POST:/physical-counts' => ['create_physical_counts'],
            'GET:/physical-counts' => ['view_stock_transactions'],

            // Purchase order endpoints
            'GET:/purchase-orders' => ['manage_suppliers', 'view_all_reports'],
            'POST:/purchase-orders' => ['manage_suppliers'],
            'PATCH:/purchase-orders/*/approve' => ['approve_purchase_orders'],

            // Report endpoints
            'GET:/reports/*' => ['view_reports', 'view_all_reports'],
            'GET:/dashboard/kpi' => ['view_dashboard_kpis'],
        ];

        $key = $method . ':' . $this->normalizeEndpoint($endpoint);
        
        if (!isset($endpointRules[$key])) {
            // If endpoint not defined, allow access (will be handled by controller)
            return true;
        }

        $requiredPermissions = $endpointRules[$key];
        return $this->hasAnyPermission($user, $requiredPermissions);
    }

    /**
     * Normalize endpoint for pattern matching
     */
    private function normalizeEndpoint(string $endpoint): string
    {
        // Convert /api/v1/products/123 to /products/*
        $endpoint = preg_replace('/^\/api\/v1/', '', $endpoint);
        $endpoint = preg_replace('/\/\d+/', '/*', $endpoint);
        
        return $endpoint;
    }

    /**
     * Check if user can perform action on resource
     */
    public function canPerformAction(User $user, string $action, string $resource, ?object $resourceInstance = null): bool
    {
        $permission = $action . '_' . $resource;
        
        if ($this->hasPermission($user, $permission)) {
            return true;
        }

        // Check for ownership-based permissions
        if ($resourceInstance && method_exists($resourceInstance, 'isOwnedBy')) {
            return $resourceInstance->isOwnedBy($user);
        }

        return false;
    }

    /**
     * Get user's role level for comparison
     */
    public function getUserRoleLevel(User $user): int
    {
        return self::ROLE_HIERARCHY[$user->role] ?? 0;
    }

    /**
     * Check if user has higher or equal role level
     */
    public function hasMinimumRoleLevel(User $user, UserRole $minimumRole): bool
    {
        $userLevel = $this->getUserRoleLevel($user);
        $minimumLevel = self::ROLE_HIERARCHY[$minimumRole->value] ?? 999;
        
        return $userLevel >= $minimumLevel;
    }
}