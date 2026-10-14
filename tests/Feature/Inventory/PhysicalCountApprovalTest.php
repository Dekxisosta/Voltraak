<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\UserRole;
use App\Support\Enums\StockTransactionType;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PhysicalCountApprovalTest extends TestCase
{
    use RefreshDatabase;

    private User $managerUser;
    private User $warehouseUser;
    private User $inventoryUser;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->managerUser = User::factory()->create(['role' => UserRole::MANAGER]);
        $this->warehouseUser = User::factory()->create(['role' => UserRole::WAREHOUSE]);
        $this->inventoryUser = User::factory()->create(['role' => UserRole::INVENTORY_STAFF]);

        $this->product = Product::factory()->create([
            'quantity' => 100,
            'unit_price' => 500.00
        ]);
    }

    /** @test */
    public function manager_can_approve_shrinkage_variance()
    {
        // Physical count shows 90 units (shrinkage of 10)
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'quantity' => 10,
                    'type' => 'decrease',
                    'physical_count_id' => $count->id,
                    'already_approved' => false,
                ]
            ]);

        // Verify physical count marked as approved
        $count->refresh();
        $this->assertTrue($count->variance_approved);
        $this->assertEquals($this->managerUser->id, $count->approved_by);
        $this->assertNotNull($count->approved_at);
        $this->assertNotNull($count->adjustment_transaction_id);

        // Verify product quantity decreased
        $this->product->refresh();
        $this->assertEquals(90, $this->product->quantity);

        // Verify adjustment transaction created
        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $this->product->id,
            'type' => StockTransactionType::ADJUSTMENT->value,
            'quantity' => 10,
            'quantity_before' => 100,
            'quantity_after' => 90,
            'reference_type' => 'physical_count',
            'reference_id' => $count->id,
            'user_id' => $this->managerUser->id,
        ]);
    }

    /** @test */
    public function manager_can_approve_overage_variance()
    {
        // Physical count shows 110 units (overage of 10)
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 110,
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'quantity' => 10,
                    'type' => 'increase',
                ]
            ]);

        // Verify product quantity increased
        $this->product->refresh();
        $this->assertEquals(110, $this->product->quantity);

        // Verify adjustment transaction created
        $transaction = StockTransaction::where('reference_id', $count->id)
            ->where('reference_type', 'physical_count')
            ->first();

        $this->assertNotNull($transaction);
        $this->assertEquals(10, $transaction->quantity);
        $this->assertEquals(110, $transaction->quantity_after);
    }

    /** @test */
    public function approving_same_variance_twice_is_idempotent()
    {
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);

        $initialQuantity = $this->product->quantity;

        // First approval
        $response1 = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response1->assertStatus(200);
        
        $firstTransactionId = $response1->json('data.transaction_id');
        $this->assertNotNull($firstTransactionId);

        // Verify quantity changed
        $this->product->refresh();
        $this->assertEquals(90, $this->product->quantity);

        // Second approval attempt (should be idempotent)
        $response2 = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response2->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'already_approved' => true,
                    'transaction_id' => $firstTransactionId,
                ]
            ]);

        // Verify no additional quantity change
        $this->product->refresh();
        $this->assertEquals(90, $this->product->quantity);

        // Verify only ONE transaction exists
        $transactionCount = StockTransaction::where('reference_id', $count->id)
            ->where('reference_type', 'physical_count')
            ->count();

        $this->assertEquals(1, $transactionCount);
    }

    /** @test */
    public function warehouse_staff_cannot_approve_variance()
    {
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Insufficient permissions.'
            ]);

        // Verify no changes
        $count->refresh();
        $this->assertFalse($count->variance_approved);
        
        $this->product->refresh();
        $this->assertEquals(100, $this->product->quantity);
    }

    /** @test */
    public function inventory_staff_cannot_approve_variance()
    {
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->inventoryUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($this->inventoryUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(403);

        // Verify no changes
        $count->refresh();
        $this->assertFalse($count->variance_approved);
    }

    /** @test */
    public function admin_can_approve_variance()
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 85,
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(200);

        $count->refresh();
        $this->assertTrue($count->variance_approved);
        $this->assertEquals($admin->id, $count->approved_by);
    }

    /** @test */
    public function approving_zero_variance_count_succeeds_but_creates_no_transaction()
    {
        // Perfect count - no variance
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 100,
            'variance_approved' => false,
        ]);

        $transactionCountBefore = StockTransaction::count();

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'quantity' => 0,
                    'type' => 'none',
                ]
            ]);

        // Count marked as approved
        $count->refresh();
        $this->assertTrue($count->variance_approved);
        $this->assertNotNull($count->approved_at);

        // But no transaction created
        $this->assertEquals($transactionCountBefore, StockTransaction::count());

        // Product quantity unchanged
        $this->product->refresh();
        $this->assertEquals(100, $this->product->quantity);
    }

    /** @test */
    public function approval_records_correct_transaction_reference()
    {
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 95,
            'count_reference' => 'CNT-2024-001',
            'variance_approved' => false,
        ]);

        $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $transaction = StockTransaction::where('reference_id', $count->id)
            ->where('reference_type', 'physical_count')
            ->first();

        $this->assertNotNull($transaction);
        $this->assertEquals('CNT-2024-001', $transaction->reference_number);
        $this->assertEquals($this->managerUser->id, $transaction->user_id);
        $this->assertStringContainsString('Shrinkage', $transaction->notes);
        $this->assertStringContainsString('5 units', $transaction->notes);
    }

    /** @test */
    public function unauthenticated_user_cannot_approve_variance()
    {
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);

        $response = $this->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(401);
    }

    /** @test */
    public function large_variance_approval_works_correctly()
    {
        // Very large shrinkage
        $count = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 20, // 80% shrinkage
            'variance_approved' => false,
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance");

        $response->assertStatus(200);

        $this->product->refresh();
        $this->assertEquals(20, $this->product->quantity);

        $transaction = StockTransaction::where('reference_id', $count->id)->first();
        $this->assertEquals(80, $transaction->quantity);
        $this->assertEquals(20, $transaction->quantity_after);
    }

    /** @test */
    public function multiple_counts_can_be_approved_independently()
    {
        $product2 = Product::factory()->create(['quantity' => 200]);

        $count1 = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 100,
            'counted_quantity' => 95,
            'variance_approved' => false,
        ]);

        $count2 = PhysicalCount::factory()->create([
            'product_id' => $product2->id,
            'counted_by' => $this->warehouseUser->id,
            'system_quantity' => 200,
            'counted_quantity' => 205,
            'variance_approved' => false,
        ]);

        // Approve first count
        $response1 = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count1->id}/approve-variance");
        $response1->assertStatus(200);

        // Approve second count
        $response2 = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count2->id}/approve-variance");
        $response2->assertStatus(200);

        // Verify both products adjusted correctly
        $this->product->refresh();
        $this->assertEquals(95, $this->product->quantity);

        $product2->refresh();
        $this->assertEquals(205, $product2->quantity);

        // Verify two separate transactions
        $this->assertEquals(2, StockTransaction::whereIn('reference_id', [$count1->id, $count2->id])->count());
    }
}
