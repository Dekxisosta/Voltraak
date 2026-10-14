<?php

namespace Tests\Feature\Reporting;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ForecastReportTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->create(['role' => UserRole::MANAGER]);
        $this->product = Product::factory()->create([
            'quantity' => 10,
            'reorder_level' => 5,
            'unit_price' => 100.00,
            'is_active' => true,
        ]);
    }

    private function stockOut(int $quantity, int $daysAgo): StockTransaction
    {
        $tx = StockTransaction::create([
            'product_id' => $this->product->id,
            'user_id' => $this->manager->id,
            'type' => StockTransactionType::OUT,
            'quantity' => $quantity,
            'quantity_before' => 100,
            'quantity_after' => 100 - $quantity,
        ]);

        $tx->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

        return $tx;
    }

    /** @test */
    public function forecast_returns_rows_in_the_shape_the_page_reads()
    {
        // 16 units over the 8-week window => 2.0 per week
        $this->stockOut(8, 3);
        $this->stockOut(8, 40);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/reports/forecast')
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $row = collect($response->json('data'))->firstWhere('id', $this->product->id);

        $this->assertNotNull($row);
        $this->assertSame($this->product->name, $row['product_name']);
        $this->assertSame($this->product->sku, $row['sku']);
        $this->assertSame(10, $row['current_stock']);
        $this->assertSame(5, $row['reorder_point']);
        $this->assertEquals(2.0, $row['avg_weekly_demand']);
        $this->assertContains($row['trend'], ['up', 'down', 'stable']);
        $this->assertIsInt($row['confidence']);
        $this->assertIsNumeric($row['unit_cost']);
    }

    /** @test */
    public function reversed_stock_outs_do_not_count_as_demand()
    {
        $tx = $this->stockOut(80, 3);

        StockTransaction::create([
            'product_id' => $this->product->id,
            'user_id' => $this->manager->id,
            'type' => StockTransactionType::ADJUSTMENT,
            'quantity' => 80,
            'quantity_before' => 20,
            'quantity_after' => 100,
            'reverses_transaction_id' => $tx->id,
        ]);

        $row = collect(
            $this->actingAs($this->manager, 'sanctum')
                ->getJson('/api/v1/reporting/reports/forecast')
                ->json('data')
        )->firstWhere('id', $this->product->id);

        $this->assertEquals(0.0, $row['avg_weekly_demand']);
    }

    /** @test */
    public function demand_trend_returns_history_plus_requested_forecast_window()
    {
        $this->stockOut(8, 3);

        foreach ([4, 8, 12] as $weeks) {
            $points = $this->actingAs($this->manager, 'sanctum')
                ->getJson("/api/v1/reporting/reports/demand-trend?timeframe={$weeks}w")
                ->assertStatus(200)
                ->json('data');

            $this->assertCount(8 + $weeks, $points);
            $this->assertSame('W-8', $points[0]['period']);
            $this->assertArrayHasKey('actual', $points[0]);
            // Boundary week carries both series so the line is continuous.
            $this->assertSame('W-1', $points[7]['period']);
            $this->assertSame($points[7]['actual'], $points[7]['forecast']);
            $this->assertSame("W+{$weeks}", end($points)['period']);
            $this->assertArrayNotHasKey('actual', end($points));
        }
    }

    /** @test */
    public function demand_trend_rejects_malformed_timeframe()
    {
        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/reports/demand-trend?timeframe=soon')
            ->assertStatus(422);
    }

    /** @test */
    public function forecast_endpoints_are_manager_and_admin_only()
    {
        foreach ([UserRole::WAREHOUSE, UserRole::INVENTORY_STAFF] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/reporting/reports/forecast')
                ->assertStatus(403);

            $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/reporting/reports/demand-trend')
                ->assertStatus(403);
        }

        $admin = User::factory()->create(['role' => UserRole::ADMIN]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/reporting/reports/forecast')
            ->assertStatus(200);
    }
}
