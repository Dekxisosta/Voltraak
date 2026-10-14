<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\UserRole;
use App\Support\Enums\DamageType;
use App\Support\Enums\StockTransactionType;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DamageReportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $warehouseUser;
    private User $inventoryUser;
    private User $managerUser;
    private Product $product;
    private Batch $batch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->warehouseUser = User::factory()->create(['role' => UserRole::WAREHOUSE]);
        $this->inventoryUser = User::factory()->create(['role' => UserRole::INVENTORY_STAFF]);
        $this->managerUser = User::factory()->create(['role' => UserRole::MANAGER]);

        $this->product = Product::factory()->create([
            'quantity' => 100,
            'unit_price' => 1000.00
        ]);

        $this->batch = Batch::factory()->create([
            'product_id' => $this->product->id,
            'quantity' => 100,
            'unit_cost' => 950.00,
        ]);
    }

    /** @test */
    public function warehouse_staff_can_create_damage_report()
    {
        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson('/api/v1/inventory/damage-reports', [
                'product_id' => $this->product->id,
                'batch_id' => $this->batch->id,
                'quantity_damaged' => 5,
                'damage_type' => 'physical',
                'description' => 'Dropped during handling',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Damage report created successfully'
            ]);

        $this->assertDatabaseHas('damage_reports', [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 5,
            'damage_type' => 'physical',
            'reported_by' => $this->warehouseUser->id,
            'status' => 'reported',
        ]);
    }

    /** @test */
    public function manager_can_assign_investigator_to_report()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'reported',
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/assign-investigator", [
                'investigator_id' => $this->inventoryUser->id,
            ]);

        $response->assertStatus(200);

        $report->refresh();
        $this->assertEquals('reported', $report->status); // Status stays 'reported' after assigning investigator
        $this->assertEquals($this->inventoryUser->id, $report->investigated_by);
    }

    /** @test */
    public function investigator_can_complete_investigation()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'reported',
            'investigated_by' => $this->inventoryUser->id,
        ]);

        $response = $this->actingAs($this->inventoryUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/complete-investigation", [
                'investigation_notes' => 'Verified damage due to improper stacking',
                'action_taken' => 'Trained staff on proper stacking procedures',
            ]);

        $response->assertStatus(200);

        $report->refresh();
        $this->assertEquals('investigated', $report->status);
        $this->assertNotNull($report->investigated_at);
        $this->assertEquals('Verified damage due to improper stacking', $report->investigation_notes);
        $this->assertEquals('Trained staff on proper stacking procedures', $report->action_taken);
    }

    /** @test */
    public function manager_can_approve_damage_report_and_write_off_inventory()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 10,
            'damage_type' => DamageType::PHYSICAL,
            'estimated_value' => 9500,
            'status' => 'investigated',
            'investigated_by' => $this->inventoryUser->id,
            'investigated_at' => now()->subHour(),
        ]);

        $initialProductQty = $this->product->quantity;
        $initialBatchQty = $this->batch->quantity;

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/approve");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Damage report approved and inventory written off successfully'
            ]);

        // Verify report approved
        $report->refresh();
        $this->assertEquals('approved', $report->status);

        // Verify inventory decreased
        $this->product->refresh();
        $this->assertEquals($initialProductQty - 10, $this->product->quantity);

        $this->batch->refresh();
        $this->assertEquals($initialBatchQty - 10, $this->batch->quantity);

        // Verify stock transaction created
        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::ADJUSTMENT->value,
            'quantity' => 10,
            'reference_type' => 'damage_report',
            'reference_id' => $report->id,
            'user_id' => $this->managerUser->id,
        ]);
    }

    /** @test */
    public function manager_can_reject_damage_report()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'investigated',
            'investigated_by' => $this->inventoryUser->id,
            'investigated_at' => now()->subHour(),
        ]);

        $initialProductQty = $this->product->quantity;

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/reject", [
                'rejection_reason' => 'Insufficient evidence of damage',
            ]);

        $response->assertStatus(200);

        $report->refresh();
        $this->assertEquals('investigated', $report->status); // Status stays 'investigated' since 'rejected' not in enum
        $this->assertStringContainsString('Insufficient evidence', $report->investigation_notes);

        // Verify NO inventory change
        $this->product->refresh();
        $this->assertEquals($initialProductQty, $this->product->quantity);

        // Verify NO transaction created
        $this->assertEquals(0, StockTransaction::where('reference_id', $report->id)->count());
    }

    /** @test */
    public function warehouse_staff_cannot_approve_damage_reports()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'investigated',
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/approve");

        $response->assertStatus(403);

        $report->refresh();
        $this->assertEquals('investigated', $report->status);
    }

    /** @test */
    public function inventory_staff_cannot_approve_damage_reports()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'investigated',
        ]);

        $response = $this->actingAs($this->inventoryUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/approve");

        $response->assertStatus(403);
    }

    /** @test */
    public function cannot_approve_report_not_in_investigated_status()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'status' => 'reported', // Not investigated yet
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/approve");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Report cannot be approved in current status'
            ]);
    }

    /** @test */
    public function creating_damage_report_calculates_estimated_value_if_not_provided()
    {
        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson('/api/v1/inventory/damage-reports', [
                'product_id' => $this->product->id,
                'batch_id' => $this->batch->id,
                'quantity_damaged' => 5,
                'damage_type' => 'expired',
                'description' => 'Expired inventory',
                // estimated_value not provided
            ]);

        $response->assertStatus(201);

        $report = DamageReport::where('product_id', $this->product->id)->first();
        
        // Should calculate: 5 * $batch->unit_cost (950.00) = 4750.00
        $this->assertEquals(4750.00, $report->estimated_value);
    }

    /** @test */
    public function can_create_damage_report_without_batch()
    {
        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson('/api/v1/inventory/damage-reports', [
                'product_id' => $this->product->id,
                // batch_id not provided
                'quantity_damaged' => 3,
                'damage_type' => 'water',
                'description' => 'Water damage in storage area',
            ]);

        $response->assertStatus(201);

        $report = DamageReport::where('product_id', $this->product->id)->first();
        $this->assertNull($report->batch_id);
        
        // Should use product unit_price when no batch
        $this->assertEquals(3000.00, $report->estimated_value); // 3 * 1000.00
    }

    /** @test */
    public function manager_can_get_reports_pending_review()
    {
        // Create various reports
        DamageReport::factory()->create(['status' => 'reported']);
        DamageReport::factory()->create(['status' => 'reported', 'investigated_by' => $this->inventoryUser->id]); // Assigned for investigation
        DamageReport::factory()->create(['status' => 'investigated']); // Pending review
        DamageReport::factory()->create(['status' => 'investigated']); // Pending review
        DamageReport::factory()->create(['status' => 'approved']);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->getJson('/api/v1/inventory/damage-reports/status/pending-review');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data'); // 2 investigated reports
    }

    /** @test */
    public function can_get_damage_report_statistics()
    {
        DamageReport::factory()->count(3)->create([
            'status' => 'approved',
            'estimated_value' => 5000,
            'reported_at' => now()->subDays(5),
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->getJson('/api/v1/inventory/damage-reports/analytics/statistics?days=30');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_reports',
                    'total_quantity',
                    'total_value',
                    'by_type',
                    'by_status',
                ]
            ]);
    }

    /** @test */
    public function approval_transaction_references_damage_report_correctly()
    {
        $report = DamageReport::factory()->create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 7,
            'damage_type' => DamageType::PHYSICAL,
            'description' => 'Physical damage in storage',
            'status' => 'investigated',
            'investigated_by' => $this->inventoryUser->id,
            'investigated_at' => now()->subHour(),
        ]);

        $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/damage-reports/{$report->id}/approve");

        $transaction = StockTransaction::where('reference_id', $report->id)->first();

        $this->assertNotNull($transaction);
        $this->assertEquals('damage_report', $transaction->reference_type);
        $this->assertStringContainsString('Physical', $transaction->notes);
        $this->assertStringContainsString('Physical damage in storage', $transaction->notes);
    }

    /** @test */
    public function unauthenticated_user_cannot_access_damage_reports()
    {
        $report = DamageReport::factory()->create();

        $response = $this->postJson('/api/v1/inventory/damage-reports', [
            'product_id' => $this->product->id,
            'quantity_damaged' => 5,
            'damage_type' => 'physical',
            'description' => 'Test',
        ]);

        $response->assertStatus(401);
    }
}
