<?php

namespace Tests\Feature\Inventory;

use App\Core\Exceptions\ConflictException;
use App\Models\User;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\CustomerOrder;
use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Services\DamageReportService;
use App\Modules\Inventory\Services\InventoryService;
use App\Support\Enums\BatchStatus;
use App\Support\Enums\DamageType;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T11-T13: variance approval, expiry write-off, write-offs vs reservations.
 */
class VarianceExpiryReservationTest extends TestCase
{
    use RefreshDatabase;

    private InventoryService $inventory;
    private User $user;
    private Product $product;
    private Batch $batch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->inventory = app(InventoryService::class);
        $this->user = User::factory()->create(['role' => UserRole::MANAGER]);
        $this->actingAs($this->user);

        $this->product = Product::create([
            'name' => 'Test Product',
            'sku' => 'VER-001',
            'unit_price' => 100,
            'quantity' => 50,
            'reorder_level' => 5,
        ]);

        $this->batch = Batch::create([
            'product_id' => $this->product->id,
            'batch_number' => 'B-1',
            'quantity' => 50,
            'received_quantity' => 50,
            'expiry_date' => now()->addMonths(2),
            'unit_cost' => 80,
        ]);
    }

    private function createCount(int $system, int $counted): PhysicalCount
    {
        return PhysicalCount::create([
            'product_id' => $this->product->id,
            'counted_by' => $this->user->id,
            'system_quantity' => $system,
            'counted_quantity' => $counted,
            'count_date' => now(),
        ]);
    }

    private function allocate(Batch $batch, int $quantity): Reservation
    {
        return Reservation::create([
            'product_id' => $this->product->id,
            'customer_order_id' => CustomerOrder::factory()->create()->id,
            'batch_id' => $batch->id,
            'quantity' => $quantity,
            'unit_price' => 100,
            'status' => 'allocated',
            'reserved_by' => $this->user->id,
            'expires_at' => now()->addDay(),
        ]);
    }

    public function test_variance_approval_lands_on_the_counted_quantity(): void
    {
        $count = $this->createCount(50, 45);

        $this->inventory->approveVarianceAdjustment($count);

        $this->assertSame(45, $this->product->fresh()->quantity);
        $this->assertTrue($count->fresh()->variance_approved);
    }

    public function test_variance_approval_is_refused_when_stock_moved_since_the_count(): void
    {
        $count = $this->createCount(50, 45);

        // 10 units leave after the count was taken.
        $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'adjustment_quantity' => -10,
        ], $this->user);

        try {
            $this->inventory->approveVarianceAdjustment($count);
            $this->fail('Expected ConflictException');
        } catch (ConflictException $e) {
            $this->assertSame(40, $this->product->fresh()->quantity);
            $this->assertFalse($count->fresh()->variance_approved);
        }
    }

    public function test_marking_a_batch_expired_writes_off_its_stock(): void
    {
        $other = Batch::create([
            'product_id' => $this->product->id,
            'batch_number' => 'B-2',
            'quantity' => 30,
            'received_quantity' => 30,
            'expiry_date' => now()->addMonths(6),
        ]);
        $this->product->update(['quantity' => 80]);

        $expired = $this->inventory->markBatchExpired($this->batch, $this->user);

        $this->assertSame(BatchStatus::EXPIRED, $expired->status);
        $this->assertSame(0, $expired->quantity);
        $this->assertSame(30, $this->product->fresh()->quantity);
        $this->assertSame(30, $other->fresh()->quantity);

        $tx = StockTransaction::where('reference_type', 'batch_expiry')->firstOrFail();
        $this->assertSame(-50, $tx->quantity);
        $this->assertSame($this->batch->id, $tx->batch_id);
    }

    public function test_expiry_moves_reservations_to_another_batch_when_one_can_cover_them(): void
    {
        $other = Batch::create([
            'product_id' => $this->product->id,
            'batch_number' => 'B-2',
            'quantity' => 30,
            'received_quantity' => 30,
            'expiry_date' => now()->addMonths(6),
        ]);
        $this->product->update(['quantity' => 80]);
        $reservation = $this->allocate($this->batch, 20);

        $this->inventory->markBatchExpired($this->batch, $this->user);

        $reservation->refresh();
        $this->assertSame('allocated', $reservation->status);
        $this->assertSame($other->id, $reservation->batch_id);
    }

    public function test_damage_write_off_hands_back_reservations_nothing_else_can_cover(): void
    {
        $reservation = $this->allocate($this->batch, 45);

        $report = DamageReport::create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 10,
            'damage_type' => DamageType::PHYSICAL,
            'description' => 'Crushed',
            'status' => 'investigated',
            'reported_by' => $this->user->id,
        ]);

        $result = app(DamageReportService::class)->approveDamageReport($report, $this->user);

        $this->assertSame(40, $this->batch->fresh()->quantity);
        $this->assertSame([$reservation->id], $result['reservations']['unallocated']);

        $reservation->refresh();
        $this->assertSame('confirmed', $reservation->status);
        $this->assertNull($reservation->batch_id);
    }

    public function test_damage_write_off_leaves_reservations_alone_when_the_batch_still_covers_them(): void
    {
        $reservation = $this->allocate($this->batch, 30);

        $report = DamageReport::create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 10,
            'damage_type' => DamageType::PHYSICAL,
            'description' => 'Crushed',
            'status' => 'investigated',
            'reported_by' => $this->user->id,
        ]);

        $result = app(DamageReportService::class)->approveDamageReport($report, $this->user);

        $this->assertSame([], $result['reservations']['unallocated']);
        $this->assertSame('allocated', $reservation->fresh()->status);
        $this->assertSame($this->batch->id, $reservation->fresh()->batch_id);
    }
}
