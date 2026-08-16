<?php

namespace Tests\Unit\Core\Permissions;

use Tests\TestCase;
use App\Core\Permissions\PermissionService;
use App\Modules\UserManagement\Models\User;
use App\Support\Enums\UserRole;

class PermissionServiceTest extends TestCase
{
    private PermissionService $permissionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->permissionService = new PermissionService();
    }

    /** @test */
    public function warehouse_user_has_correct_permissions()
    {
        $user = new User(['role' => UserRole::WAREHOUSE->value]);

        $this->assertTrue($this->permissionService->hasPermission($user, 'view_products'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'create_physical_counts'));
        $this->assertFalse($this->permissionService->hasPermission($user, 'manage_products'));
        $this->assertFalse($this->permissionService->hasPermission($user, 'manage_users'));
    }

    /** @test */
    public function inventory_user_inherits_warehouse_permissions()
    {
        $user = new User(['role' => UserRole::INVENTORY->value]);

        // Should have warehouse permissions
        $this->assertTrue($this->permissionService->hasPermission($user, 'view_products'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'create_physical_counts'));
        
        // Plus inventory-specific permissions
        $this->assertTrue($this->permissionService->hasPermission($user, 'manage_products'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'manage_stock_transactions'));
        
        // But not manager permissions
        $this->assertFalse($this->permissionService->hasPermission($user, 'manage_users'));
    }

    /** @test */
    public function manager_user_has_all_permissions()
    {
        $user = new User(['role' => UserRole::MANAGER->value]);

        $this->assertTrue($this->permissionService->hasPermission($user, 'view_products'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'manage_products'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'manage_users'));
        $this->assertTrue($this->permissionService->hasPermission($user, 'approve_purchase_orders'));
    }

    /** @test */
    public function it_checks_any_permission_correctly()
    {
        $warehouseUser = new User(['role' => UserRole::WAREHOUSE->value]);
        
        $this->assertTrue($this->permissionService->hasAnyPermission(
            $warehouseUser, 
            ['manage_users', 'view_products'] // Has view_products
        ));
        
        $this->assertFalse($this->permissionService->hasAnyPermission(
            $warehouseUser, 
            ['manage_users', 'manage_products'] // Has neither
        ));
    }

    /** @test */
    public function it_checks_all_permissions_correctly()
    {
        $inventoryUser = new User(['role' => UserRole::INVENTORY->value]);
        
        $this->assertTrue($this->permissionService->hasAllPermissions(
            $inventoryUser, 
            ['view_products', 'manage_products'] // Has both
        ));
        
        $this->assertFalse($this->permissionService->hasAllPermissions(
            $inventoryUser, 
            ['manage_products', 'manage_users'] // Missing manage_users
        ));
    }

    /** @test */
    public function it_checks_feature_access_correctly()
    {
        $warehouseUser = new User(['role' => UserRole::WAREHOUSE->value]);
        $inventoryUser = new User(['role' => UserRole::INVENTORY->value]);
        $managerUser = new User(['role' => UserRole::MANAGER->value]);

        // Warehouse access
        $this->assertTrue($this->permissionService->hasFeatureAccess($warehouseUser, 'warehouse'));
        $this->assertFalse($this->permissionService->hasFeatureAccess($warehouseUser, 'inventory'));
        $this->assertFalse($this->permissionService->hasFeatureAccess($warehouseUser, 'manager'));

        // Inventory access
        $this->assertTrue($this->permissionService->hasFeatureAccess($inventoryUser, 'warehouse'));
        $this->assertTrue($this->permissionService->hasFeatureAccess($inventoryUser, 'inventory'));
        $this->assertFalse($this->permissionService->hasFeatureAccess($inventoryUser, 'manager'));

        // Manager access
        $this->assertTrue($this->permissionService->hasFeatureAccess($managerUser, 'warehouse'));
        $this->assertTrue($this->permissionService->hasFeatureAccess($managerUser, 'inventory'));
        $this->assertTrue($this->permissionService->hasFeatureAccess($managerUser, 'manager'));
    }

    /** @test */
    public function it_gets_user_permissions_with_inheritance()
    {
        $warehousePermissions = $this->permissionService->getUserPermissions(UserRole::WAREHOUSE);
        $inventoryPermissions = $this->permissionService->getUserPermissions(UserRole::INVENTORY);
        $managerPermissions = $this->permissionService->getUserPermissions(UserRole::MANAGER);

        // Warehouse should have only warehouse permissions
        $this->assertContains('view_products', $warehousePermissions);
        $this->assertNotContains('manage_products', $warehousePermissions);

        // Inventory should have warehouse + inventory permissions
        $this->assertContains('view_products', $inventoryPermissions);
        $this->assertContains('manage_products', $inventoryPermissions);
        $this->assertNotContains('manage_users', $inventoryPermissions);

        // Manager should have all permissions
        $this->assertContains('view_products', $managerPermissions);
        $this->assertContains('manage_products', $managerPermissions);
        $this->assertContains('manage_users', $managerPermissions);
    }

    /** @test */
    public function it_checks_role_levels_correctly()
    {
        $warehouseUser = new User(['role' => UserRole::WAREHOUSE->value]);
        $inventoryUser = new User(['role' => UserRole::INVENTORY->value]);
        $managerUser = new User(['role' => UserRole::MANAGER->value]);

        $this->assertEquals(1, $this->permissionService->getUserRoleLevel($warehouseUser));
        $this->assertEquals(2, $this->permissionService->getUserRoleLevel($inventoryUser));
        $this->assertEquals(3, $this->permissionService->getUserRoleLevel($managerUser));
    }

    /** @test */
    public function it_checks_minimum_role_level()
    {
        $warehouseUser = new User(['role' => UserRole::WAREHOUSE->value]);
        $inventoryUser = new User(['role' => UserRole::INVENTORY->value]);
        $managerUser = new User(['role' => UserRole::MANAGER->value]);

        // Warehouse user can access warehouse features
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($warehouseUser, UserRole::WAREHOUSE));
        $this->assertFalse($this->permissionService->hasMinimumRoleLevel($warehouseUser, UserRole::INVENTORY));

        // Inventory user can access warehouse and inventory features
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($inventoryUser, UserRole::WAREHOUSE));
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($inventoryUser, UserRole::INVENTORY));
        $this->assertFalse($this->permissionService->hasMinimumRoleLevel($inventoryUser, UserRole::MANAGER));

        // Manager can access all features
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($managerUser, UserRole::WAREHOUSE));
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($managerUser, UserRole::INVENTORY));
        $this->assertTrue($this->permissionService->hasMinimumRoleLevel($managerUser, UserRole::MANAGER));
    }

    /** @test */
    public function it_returns_all_permissions_in_system()
    {
        $allPermissions = $this->permissionService->getAllPermissions();

        $this->assertIsArray($allPermissions);
        $this->assertContains('view_products', $allPermissions);
        $this->assertContains('manage_products', $allPermissions);
        $this->assertContains('manage_users', $allPermissions);
        
        // Should not contain duplicates
        $this->assertEquals(count($allPermissions), count(array_unique($allPermissions)));
    }
}