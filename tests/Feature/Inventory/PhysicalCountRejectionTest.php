<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PhysicalCountRejectionTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private User $warehouse;
    private User $inventory;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->create(['role' => UserRole::MANAGER]);
        $this->warehouse = User::factory()->create(['role' => UserRole::WAREHOUSE]);
        $this->inventory = User::factory()->create(['role' => UserRole::INVENTORY_STAFF]);
        $this->product = Product::factory()->create(['quantity' => 100, 'unit_price' => 500.00]);
    }

    private function shrinkageCount(): PhysicalCount
    {
        return PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 90,
            'variance_approved' => false,
        ]);
    }

    /** @test */
    public function manager_can_reject_variance_without_changing_stock()
    {
        $count = $this->shrinkageCount();
        $transactionsBefore = StockTransaction::count();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/reject-variance", [
                'rejection_reason' => 'Recount needed',
            ])
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'physical_count_id' => $count->id,
                    'already_rejected' => false,
                    'physical_count' => ['approval_status' => 'rejected'],
                ],
            ]);

        $count->refresh();
        $this->assertFalse($count->variance_approved);
        $this->assertNotNull($count->rejected_at);
        $this->assertEquals($this->manager->id, $count->rejected_by);
        $this->assertEquals('Recount needed', $count->rejection_notes);

        $this->product->refresh();
        $this->assertEquals(100, $this->product->quantity);
        $this->assertEquals($transactionsBefore, StockTransaction::count());
    }

    /** @test */
    public function rejection_reason_is_optional()
    {
        $count = $this->shrinkageCount();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/reject-variance")
            ->assertStatus(200);

        $this->assertEquals('Rejected by manager', $count->fresh()->rejection_notes);
    }

    /** @test */
    public function rejecting_twice_is_idempotent()
    {
        $count = $this->shrinkageCount();
        $url = "/api/v1/inventory/physical-counts/{$count->id}/reject-variance";

        $this->actingAs($this->manager, 'sanctum')->postJson($url)->assertStatus(200);

        $this->actingAs($this->manager, 'sanctum')->postJson($url)
            ->assertStatus(200)
            ->assertJson(['data' => ['already_rejected' => true]]);
    }

    /** @test */
    public function rejected_count_cannot_be_approved()
    {
        $count = $this->shrinkageCount();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/reject-variance")
            ->assertStatus(200);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance")
            ->assertStatus(409);

        $this->assertFalse($count->fresh()->variance_approved);
        $this->assertEquals(100, $this->product->fresh()->quantity);
    }

    /** @test */
    public function approved_count_cannot_be_rejected()
    {
        $count = $this->shrinkageCount();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/approve-variance")
            ->assertStatus(200);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/reject-variance")
            ->assertStatus(409);

        $this->assertNull($count->fresh()->rejected_at);
    }

    /** @test */
    public function non_managers_cannot_reject_variance()
    {
        $count = $this->shrinkageCount();
        $url = "/api/v1/inventory/physical-counts/{$count->id}/reject-variance";

        $this->actingAs($this->inventory, 'sanctum')->postJson($url)->assertStatus(403);
        $this->actingAs($this->warehouse, 'sanctum')->postJson($url)->assertStatus(403);

        $this->assertNull($count->fresh()->rejected_at);
    }

    /** @test */
    public function admin_can_reject_variance()
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $count = $this->shrinkageCount();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/inventory/physical-counts/{$count->id}/reject-variance")
            ->assertStatus(200);

        $this->assertEquals($admin->id, $count->fresh()->rejected_by);
    }

    /** @test */
    public function approval_queue_lists_flat_fields_and_filters_by_status()
    {
        $pending = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 80,
            'variance_approved' => false,
        ]);
        $rejected = PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 70,
            'variance_approved' => false,
            'rejected_at' => now(),
            'rejected_by' => $this->manager->id,
        ]);
        // Perfect counts never belong in the queue.
        PhysicalCount::factory()->create([
            'product_id' => $this->product->id,
            'counted_by' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 100,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/inventory/physical-counts?requires_approval=true&per_page=100')
            ->assertStatus(200);

        $rows = collect($response->json('data'))->keyBy('id');
        $this->assertCount(2, $rows);

        $row = $rows[$pending->id];
        $this->assertSame('pending', $row['approval_status']);
        $this->assertTrue($row['requires_approval']);
        $this->assertSame($this->product->name, $row['product_name']);
        $this->assertSame($this->product->sku, $row['product_sku']);
        $this->assertSame($this->warehouse->name, $row['reported_by']);
        $this->assertSame(-20, $row['variance']);
        $this->assertIsFloat($row['variance_percentage']);
        $this->assertEquals(10000.0, $row['write_off_amount']);
        $this->assertContains($row['priority'], ['high', 'medium', 'low']);
        $this->assertSame('rejected', $rows[$rejected->id]['approval_status']);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/inventory/physical-counts?approval_status=pending')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}
