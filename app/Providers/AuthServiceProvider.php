<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Support\Enums\UserRole;
use App\Core\Permissions\PermissionService;

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
     * Dot-notation ability strings (as used via `$this->authorize(...)`
     * throughout the Inventory and Reporting module controllers) mapped
     * onto the permission names already defined in
     * PermissionService::ROLE_PERMISSIONS. Since getUserPermissions()
     * accumulates permissions from all lower roles in the hierarchy
     * (warehouse < inventory < manager), listing the lowest-tier
     * permission that should satisfy an ability is sufficient - higher
     * roles inherit it automatically.
     *
     * None of these abilities had a registered Gate or Policy before this
     * mapping existed, which meant every one of them was silently denied
     * by Laravel's default-deny behavior for unmatched abilities.
     */
    private const ABILITY_PERMISSIONS = [
        // Inventory: Product
        'product.read' => ['view_products'],
        'product.create' => ['manage_products'],
        'product.update' => ['manage_products'],
        'product.delete' => ['manage_products'],

        // Inventory: Batch
        'batch.read' => ['view_batches'],
        'batch.create' => ['manage_batches'],
        'batch.update' => ['manage_batches'],
        'batch.delete' => ['manage_batches'],

        // Inventory: Stock Transaction
        'stock_transaction.read' => ['view_stock_transactions'],
        'stock_transaction.create' => ['receive_stock', 'manage_stock_transactions'],

        // Inventory: Physical Count
        'physical_count.read' => ['create_physical_counts'],
        'physical_count.create' => ['create_physical_counts'],
        'physical_count.update' => ['create_physical_counts', 'manage_products'],
        'physical_count.delete' => ['manage_products'],
        'physical_count.approve' => ['manage_products', 'configure_reorder_points'],

        // Inventory: Damage Report
        'damage_report.read' => ['view_stock_transactions', 'create_damage_reports'],
        'damage_report.create' => ['create_damage_reports', 'create_physical_counts'],
        'damage_report.update' => ['create_damage_reports', 'manage_products'],
        'damage_report.delete' => ['manage_products'],
        'damage_report.investigate' => ['manage_products', 'approve_purchase_orders'],
        'damage_report.approve' => ['approve_purchase_orders', 'configure_reorder_points'],

        // Inventory: Discrepancy Report (investigation is inventory staff and
        // up; warehouse staff may only raise one)
        'discrepancy_report.read' => ['manage_stock_transactions'],
        'discrepancy_report.create' => ['create_discrepancy_reports'],
        'discrepancy_report.update' => ['manage_stock_transactions'],
        'discrepancy_report.approve' => ['manage_products', 'approve_purchase_orders'],

        // Inventory: Reservation (inventory staff and up)
        'reservation.read' => ['manage_reservations'],
        'reservation.cancel' => ['manage_reservations'],

        // Inventory: Customer Order
        'customer_order.read' => ['view_stock_transactions', 'manage_customer_orders'],
        'customer_order.create' => ['manage_customer_orders'],
        'customer_order.update' => ['manage_customer_orders'],
        'customer_order.delete' => ['manage_customer_orders'],
        'customer_order.fulfill' => ['receive_stock', 'view_stock_transactions'],
        'customer_order.cancel' => ['manage_customer_orders'],

        // Procurement: Supplier
        'supplier.read' => ['view_suppliers'],
        'supplier.create' => ['manage_suppliers'],
        'supplier.update' => ['manage_suppliers'],
        'supplier.delete' => ['manage_suppliers'],

        // Procurement: Purchase Order
        'purchase_order.read' => ['view_suppliers', 'receive_stock'],
        'purchase_order.create' => ['manage_suppliers'],
        'purchase_order.update' => ['manage_suppliers'],
        'purchase_order.delete' => ['manage_suppliers'],
        'purchase_order.approve' => ['approve_purchase_orders'],
        'purchase_order.receive' => ['receive_stock', 'manage_suppliers'],
        'purchase_order.cancel' => ['manage_suppliers'],

        // Procurement: Procurement Request
        'procurement_request.read' => ['view_suppliers'],
        'procurement_request.create' => ['manage_suppliers'],
        'procurement_request.update' => ['manage_suppliers'],
        'procurement_request.delete' => ['manage_suppliers'],
        'procurement_request.generate' => ['manage_suppliers'],
        'procurement_request.review' => ['approve_purchase_orders'],
        'procurement_request.convert' => ['approve_purchase_orders'],

        // Reporting: Dashboards
        'dashboard.staff' => ['view_products'],
        'dashboard.manager' => ['view_reports'],
        'dashboard.executive' => ['view_all_reports'],
        'dashboard.kpis' => ['view_dashboard_kpis', 'view_reports'],
        'dashboard.trends' => ['view_reports'],
        'dashboard.analytics' => ['view_reports'],
        'dashboard.alerts' => ['view_products'],
        'dashboard.accuracy' => ['view_reports'],
        'dashboard.performance' => ['view_reports'],
        'dashboard.export' => ['export_reports', 'view_all_reports'],

        // Reporting: Reports
        'report.inventory' => ['view_reports'],
        'report.accuracy' => ['view_reports'],
        'report.procurement' => ['view_suppliers', 'view_all_reports'],
        'report.analytics' => ['view_reports'],
        'report.forecast' => ['view_all_reports'],
        'report.low_stock' => ['view_all_reports'],
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
            return in_array($user->role, [UserRole::MANAGER, UserRole::ADMIN]);
        });

        Gate::define('admin-access', function (User $user) {
            return $user->role === UserRole::ADMIN;
        });

        // Resolve all the dot-notation abilities used by the Inventory and
        // Reporting controllers (via $this->authorize('resource.action'))
        // against the existing role/permission model. Returning null lets
        // any other gate/policy still decide abilities not in this map.
        Gate::before(function (User $user, string $ability) {
            // Admin has all permissions
            if ($user->role === UserRole::ADMIN) {
                return true;
            }
            
            if (!isset(self::ABILITY_PERMISSIONS[$ability])) {
                return null;
            }

            $permissionService = app(PermissionService::class);

            return $permissionService->hasAnyPermission($user, self::ABILITY_PERMISSIONS[$ability])
                ? true
                : null;
        });
    }
}