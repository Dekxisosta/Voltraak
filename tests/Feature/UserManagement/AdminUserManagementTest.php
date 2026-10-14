<?php

namespace Tests\Feature\UserManagement;

use App\Models\User;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the request/response contract the admin User Management page relies on,
 * plus the RBAC rules behind it.
 */
class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Str0ng@Pass';

    private function actingAsRole(UserRole $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_admin_list_uses_items_envelope_and_exposes_last_login_at(): void
    {
        $this->actingAsRole(UserRole::ADMIN);
        User::factory()->count(3)->create(['role' => UserRole::WAREHOUSE]);

        $this->getJson('/api/v1/users?per_page=100')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'items' => [['id', 'name', 'email', 'role', 'role_display', 'is_active', 'last_login_at']],
                    'pagination' => ['current_page', 'per_page', 'total', 'last_page'],
                ],
            ]);
    }

    public function test_inactive_filter_is_honoured(): void
    {
        $this->actingAsRole(UserRole::ADMIN);
        User::factory()->inactive()->create(['role' => UserRole::WAREHOUSE]);

        $response = $this->getJson('/api/v1/users?is_active=0')->assertOk();

        $items = $response->json('data.items');
        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertFalse($item['is_active']);
        }
    }

    public function test_statistics_route_is_not_captured_by_id_route(): void
    {
        $this->actingAsRole(UserRole::ADMIN);

        $this->getJson('/api/v1/users/statistics')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total_users', 'active_users', 'by_role']]);
    }

    public function test_staff_cannot_access_user_administration(): void
    {
        $this->actingAsRole(UserRole::WAREHOUSE);

        $this->getJson('/api/v1/users')->assertForbidden();
        $this->postJson('/api/v1/users', [])->assertForbidden();
    }

    public function test_admin_can_create_manager_but_manager_cannot(): void
    {
        $admin = $this->actingAsRole(UserRole::ADMIN);

        $payload = [
            'name' => 'New Manager',
            'email' => 'new.manager@example.com',
            'password' => self::PASSWORD,
            'role' => 'manager',
            'is_active' => true,
        ];

        $this->postJson('/api/v1/users', $payload)
            ->assertCreated()
            ->assertJsonPath('data.role', 'manager');

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::MANAGER]));

        $this->postJson('/api/v1/users', array_merge($payload, ['email' => 'second@example.com']))
            ->assertStatus(422);
        $this->postJson('/api/v1/users', array_merge($payload, ['email' => 'third@example.com', 'role' => 'admin']))
            ->assertStatus(422);
    }

    public function test_manager_cannot_modify_admin_or_manager_accounts(): void
    {
        $this->actingAsRole(UserRole::MANAGER);
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $this->putJson("/api/v1/users/{$admin->id}", ['name' => 'Hacked'])->assertStatus(422);
        $this->patchJson("/api/v1/users/{$admin->id}/toggle-status")->assertStatus(422);
        $this->deleteJson("/api/v1/users/{$admin->id}")->assertStatus(422);
    }

    public function test_validation_errors_use_context_errors_envelope(): void
    {
        $this->actingAsRole(UserRole::ADMIN);

        $this->postJson('/api/v1/users', ['name' => 'X'])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['message', 'context' => ['errors' => ['email', 'password', 'role']]]]);
    }

    public function test_admin_can_toggle_status_but_not_their_own(): void
    {
        $admin = $this->actingAsRole(UserRole::ADMIN);
        $target = User::factory()->create(['role' => UserRole::WAREHOUSE, 'is_active' => true]);

        $this->patchJson("/api/v1/users/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->patchJson("/api/v1/users/{$admin->id}/toggle-status")->assertStatus(422);
    }

    public function test_admin_can_delete_other_users_but_not_themselves(): void
    {
        $admin = $this->actingAsRole(UserRole::ADMIN);
        $target = User::factory()->create(['role' => UserRole::WAREHOUSE]);

        $this->deleteJson("/api/v1/users/{$target->id}")->assertOk();
        $this->assertSoftDeleted('users', ['id' => $target->id]);

        $this->deleteJson("/api/v1/users/{$admin->id}")->assertStatus(422);
    }

    public function test_unknown_user_returns_404(): void
    {
        $this->actingAsRole(UserRole::ADMIN);

        $this->putJson('/api/v1/users/999999', ['name' => 'Ghost'])->assertNotFound();
        $this->patchJson('/api/v1/users/999999/toggle-status')->assertNotFound();
        $this->deleteJson('/api/v1/users/999999')->assertNotFound();
    }
}
