<?php

namespace Tests\Feature\Reporting;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\StockTransactionType;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ManagerKpiAndLowStockTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->create(['role' => UserRole::MANAGER]);
    }

    private function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'quantity' => 100,
            'reorder_level' => 10,
            'unit_price' => 100.00,
            'is_active' => true,
        ], $attributes));
    }

    private function transaction(Product $product, StockTransactionType $type, int $quantity, int $daysAgo = 1): StockTransaction
    {
        $tx = StockTransaction::create([
            'product_id' => $product->id,
            'user_id' => $this->manager->id,
            'type' => $type,
            'quantity' => $quantity,
            'quantity_before' => 0,
            'quantity_after' => 0,
        ]);

        $tx->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

        return $tx;
    }

    /** @test */
    public function low_stock_returns_rows_in_the_shape_the_page_reads()
    {
        $product = $this->product(['quantity' => 6, 'reorder_level' => 10, 'max_stock_level' => null]);
        // 30 units over the 30-day window => 1.0 per day => 6 days of cover
        $this->transaction($product, StockTransactionType::OUT, 30, 5);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/reports/low-stock')
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $row = collect($response->json('data'))->firstWhere('id', $product->id);

        $this->assertNotNull($row);
        $this->assertSame($product->name, $row['product_name']);
        $this->assertSame($product->sku, $row['sku']);
        $this->assertSame(6, $row['current_stock']);
        $this->assertSame(10, $row['reorder_point']);
        $this->assertSame(5, $row['minimum_stock']);
        $this->assertEquals(1.0, $row['avg_daily_sales']);
        $this->assertSame(6, $row['days_until_stockout']);
        $this->assertSame('critical', $row['status']);
        $this->assertSame(14, $row['suggested_order_qty']); // 2 x reorder point - stock
    }

    /** @test */
    public function suggested_order_qty_restocks_up_to_the_max_stock_level_when_set()
    {
        $product = $this->product(['quantity' => 4, 'reorder_level' => 10, 'max_stock_level' => 60]);

        $row = collect(
            $this->actingAs($this->manager, 'sanctum')
                ->getJson('/api/v1/reporting/reports/low-stock')
                ->json('data')
        )->firstWhere('id', $product->id);

        $this->assertSame(56, $row['suggested_order_qty']);
    }

    /** @test */
    public function low_stock_only_lists_active_products_at_or_below_reorder_point()
    {
        $low = $this->product(['quantity' => 10, 'reorder_level' => 10]);
        $healthy = $this->product(['quantity' => 50, 'reorder_level' => 10]);
        $inactive = $this->product(['quantity' => 1, 'reorder_level' => 10, 'is_active' => false]);
        $noReorderLevel = $this->product(['quantity' => 0, 'reorder_level' => 0]);

        $ids = collect(
            $this->actingAs($this->manager, 'sanctum')
                ->getJson('/api/v1/reporting/reports/low-stock')
                ->assertStatus(200)
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($low->id));
        $this->assertFalse($ids->contains($healthy->id));
        $this->assertFalse($ids->contains($inactive->id));
        $this->assertFalse($ids->contains($noReorderLevel->id));
    }

    /** @test */
    public function low_stock_classifies_status_and_handles_missing_sales_history()
    {
        $out = $this->product(['quantity' => 0, 'reorder_level' => 10]);
        $noSales = $this->product(['quantity' => 8, 'reorder_level' => 10]);

        $rows = collect(
            $this->actingAs($this->manager, 'sanctum')
                ->getJson('/api/v1/reporting/reports/low-stock')
                ->json('data')
        );

        $outRow = $rows->firstWhere('id', $out->id);
        $this->assertSame('out_of_stock', $outRow['status']);
        $this->assertSame(0, $outRow['days_until_stockout']);

        // No recent sales: cover cannot be estimated, so the field is null (not a number).
        $noSalesRow = $rows->firstWhere('id', $noSales->id);
        $this->assertSame('low', $noSalesRow['status']);
        $this->assertNull($noSalesRow['days_until_stockout']);
        $this->assertGreaterThanOrEqual(1, $noSalesRow['suggested_order_qty']);

        // Most urgent first
        $this->assertSame($out->id, $rows->first()['id']);
    }

    /** @test */
    public function reversed_stock_outs_do_not_count_towards_sales_rate()
    {
        $product = $this->product(['quantity' => 6, 'reorder_level' => 10]);
        $tx = $this->transaction($product, StockTransactionType::OUT, 30, 5);

        StockTransaction::create([
            'product_id' => $product->id,
            'user_id' => $this->manager->id,
            'type' => StockTransactionType::ADJUSTMENT,
            'quantity' => 30,
            'quantity_before' => 0,
            'quantity_after' => 30,
            'reverses_transaction_id' => $tx->id,
        ]);

        $row = collect(
            $this->actingAs($this->manager, 'sanctum')
                ->getJson('/api/v1/reporting/reports/low-stock')
                ->json('data')
        )->firstWhere('id', $product->id);

        $this->assertEquals(0, $row['avg_daily_sales']);
        $this->assertNull($row['days_until_stockout']);
    }

    /** @test */
    public function low_stock_and_manager_kpis_are_manager_only()
    {
        foreach ([UserRole::INVENTORY_STAFF, UserRole::WAREHOUSE] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/reporting/reports/low-stock')
                ->assertStatus(403);

            $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/reporting/dashboard/manager-kpis')
                ->assertStatus(403);
        }
    }

    /** @test */
    public function manager_kpis_returns_the_structure_the_page_reads()
    {
        $this->product(['quantity' => 5, 'reorder_level' => 10, 'category' => 'Refrigerators']);
        $this->product(['quantity' => 50, 'reorder_level' => 10, 'category' => 'Washers']);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/dashboard/manager-kpis')
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $data = $response->json('data');

        foreach (['metrics', 'changes', 'trends', 'categoryBreakdown', 'alerts', 'pendingApprovals', 'movementSummary', 'topMovers', 'criticalStock'] as $key) {
            $this->assertArrayHasKey($key, $data);
        }

        foreach (['totalSKUs', 'stockValue', 'lowStockItems', 'shrinkageRate', 'inventoryAccuracy', 'turnoverRate', 'serviceLevel', 'fefoCompliance'] as $key) {
            $this->assertArrayHasKey($key, $data['metrics']);
        }

        $this->assertSame(2, $data['metrics']['totalSKUs']);
        $this->assertEquals(5 * 100 + 50 * 100, $data['metrics']['stockValue']);
        $this->assertSame(1, $data['metrics']['lowStockItems']);
        $this->assertNull($data['metrics']['inventoryAccuracy']); // no physical counts

        // 6 monthly points ending with the current stock value
        $this->assertCount(6, $data['trends']['stockValue']);
        $this->assertEquals($data['metrics']['stockValue'], end($data['trends']['stockValue'])['value']);

        $this->assertEqualsWithDelta(100.0, collect($data['categoryBreakdown'])->sum('value'), 0.2);

        // quantity 5 is at the safety floor (half the reorder point) => critical watchlist entry
        $this->assertCount(1, $data['criticalStock']);
        $this->assertEqualsCanonicalizing(
            ['id', 'productName', 'sku', 'status', 'daysUntilStockout'],
            array_keys($data['criticalStock'][0])
        );
        $this->assertSame('critical', $data['criticalStock'][0]['status']);
    }

    /** @test */
    public function manager_kpi_low_stock_count_matches_the_low_stock_page()
    {
        $this->product(['quantity' => 0, 'reorder_level' => 10]);
        $this->product(['quantity' => 4, 'reorder_level' => 10]);
        $this->product(['quantity' => 80, 'reorder_level' => 10]);

        $alerts = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/reports/low-stock')
            ->json('data');

        $kpis = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/dashboard/manager-kpis')
            ->json('data');

        $this->assertCount(2, $alerts);
        $this->assertSame(count($alerts), $kpis['metrics']['lowStockItems']);
    }

    /** @test */
    public function manager_kpis_movement_summary_follows_the_requested_timeframe()
    {
        $product = $this->product();

        $this->transaction($product, StockTransactionType::IN, 40, 2);
        $this->transaction($product, StockTransactionType::OUT, 15, 3);
        $this->transaction($product, StockTransactionType::ADJUSTMENT, -5, 4);
        $this->transaction($product, StockTransactionType::OUT, 20, 20); // outside 7d, inside 30d

        $week = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/dashboard/manager-kpis?timeframe=7d')
            ->assertStatus(200)
            ->json('data.movementSummary');

        $this->assertSame(['stockIn' => 40, 'stockOut' => 15, 'adjustments' => 5, 'netChange' => 20], $week);

        $month = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/dashboard/manager-kpis?timeframe=30d')
            ->json('data');

        $this->assertSame(35, $month['movementSummary']['stockOut']);
        $this->assertSame(35, $month['topMovers'][0]['unitsSold']);
        $this->assertEquals(35 * 100, $month['topMovers'][0]['revenue']);
    }

    /** @test */
    public function manager_kpis_rejects_an_unsupported_timeframe()
    {
        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/reporting/dashboard/manager-kpis?timeframe=1y')
            ->assertStatus(422);
    }
}
