<?php

namespace Tests\Feature\Inventory;

use App\Core\Exceptions\ConflictException;
use App\Models\User;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Services\DamageReportService;
use App\Modules\Inventory\Services\InventoryService;
use App\Support\Enums\DamageType;
use App\Support\Enums\StockTransactionType;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T8-T10: one writer for stock quantities, signed adjustments, safe reversal.
 */
class StockLedgerTest extends TestCase
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

        $this->product = Product::create([
            'name' => 'Test Product',
            'sku' => 'LEDGER-001',
            'unit_price' => 100,
            'quantity' => 50,
            'reorder_level' => 5,
        ]);

        $this->batch = Batch::create([
            'product_id' => $this->product->id,
            'batch_number' => 'B-1',
            'quantity' => 50,
            'received_quantity' => 50,
            'expiry_date' => now()->addYear(),
            'unit_cost' => 80,
        ]);
    }

    private function quantities(): array
    {
        return [
            'product' => $this->product->fresh()->quantity,
            'batch' => $this->batch->fresh()->quantity,
        ];
    }

    public function test_adjustment_moves_batch_and_product_and_keeps_its_sign(): void
    {
        $down = $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'adjustment_quantity' => -7,
        ], $this->user);

        $up = $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'adjustment_quantity' => 3,
        ], $this->user);

        $this->assertSame(-7, $down->quantity);
        $this->assertTrue($down->decreasesStock());
        $this->assertSame(3, $up->quantity);
        $this->assertTrue($up->increasesStock());
        $this->assertSame(['product' => 46, 'batch' => 46], $this->quantities());
        $this->assertSame('80.00', $down->unit_cost);
    }

    public function test_adjustment_below_zero_is_rejected_and_changes_nothing(): void
    {
        try {
            $this->inventory->adjustStock([
                'product_id' => $this->product->id,
                'batch_id' => $this->batch->id,
                'adjustment_quantity' => -51,
            ], $this->user);
            $this->fail('Expected ConflictException');
        } catch (ConflictException $e) {
            $this->assertSame(['product' => 50, 'batch' => 50], $this->quantities());
            $this->assertSame(0, StockTransaction::count());
        }
    }

    public function test_receive_and_issue_keep_batch_and_product_in_step(): void
    {
        $this->inventory->receiveStock([
            'product_id' => $this->product->id,
            'quantity' => 20,
            'batch_data' => ['batch_number' => 'B-1'],
        ], $this->user);

        $this->assertSame(['product' => 70, 'batch' => 70], $this->quantities());
        $this->assertSame(70, $this->batch->fresh()->received_quantity);

        $this->inventory->issueStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 15,
        ], $this->user);

        $this->assertSame(['product' => 55, 'batch' => 55], $this->quantities());
    }

    public function test_reversing_a_decrease_restores_stock_and_cannot_be_repeated(): void
    {
        $original = $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'adjustment_quantity' => -10,
        ], $this->user);

        $reversal = $this->inventory->reverseTransaction($original, $this->user);

        $this->assertSame(10, $reversal->quantity);
        $this->assertSame($original->id, $reversal->reverses_transaction_id);
        $this->assertSame(['product' => 50, 'batch' => 50], $this->quantities());

        $this->expectException(ConflictException::class);
        try {
            $this->inventory->reverseTransaction($original, $this->user);
        } finally {
            $this->assertSame(['product' => 50, 'batch' => 50], $this->quantities());
        }
    }

    public function test_reversing_an_overage_takes_the_stock_back_out(): void
    {
        $original = $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'adjustment_quantity' => 12,
        ], $this->user);

        $reversal = $this->inventory->reverseTransaction($original, $this->user);

        $this->assertSame(-12, $reversal->quantity);
        $this->assertSame(['product' => 50, 'batch' => 50], $this->quantities());
    }

    public function test_a_reversal_cannot_itself_be_reversed(): void
    {
        $original = $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'adjustment_quantity' => -1,
        ], $this->user);
        $reversal = $this->inventory->reverseTransaction($original, $this->user);

        $this->expectException(ConflictException::class);
        $this->inventory->reverseTransaction($reversal, $this->user);
    }

    public function test_transfers_cannot_be_reversed(): void
    {
        $transfer = $this->inventory->transferStock([
            'product_id' => $this->product->id,
            'quantity' => 5,
        ], $this->user);

        $this->expectException(ConflictException::class);
        $this->inventory->reverseTransaction($transfer, $this->user);
    }

    public function test_reversing_a_receipt_fails_when_the_stock_has_already_gone(): void
    {
        $receipt = $this->inventory->receiveStock([
            'product_id' => $this->product->id,
            'quantity' => 10,
            'batch_data' => ['batch_number' => 'B-2'],
        ], $this->user);

        $b2 = Batch::where('batch_number', 'B-2')->firstOrFail();
        $this->inventory->issueStock([
            'product_id' => $this->product->id,
            'batch_id' => $b2->id,
            'quantity' => 10,
        ], $this->user);

        $this->expectException(ConflictException::class);
        $this->inventory->reverseTransaction($receipt, $this->user);
    }

    public function test_damage_approval_writes_off_once_and_reversal_reopens_the_report(): void
    {
        $report = DamageReport::create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity_damaged' => 4,
            'damage_type' => DamageType::cases()[0],
            'description' => 'Dropped pallet',
            'status' => 'investigated',
            'reported_by' => $this->user->id,
        ]);

        $service = app(DamageReportService::class);
        $result = $service->approveDamageReport($report, $this->user);

        $this->assertSame(-4, $result['transaction']->quantity);
        $this->assertSame('approved', $report->fresh()->status);
        $this->assertSame(['product' => 46, 'batch' => 46], $this->quantities());

        // Second approval is refused and does not write off again.
        try {
            $service->approveDamageReport($report->fresh(), $this->user);
            $this->fail('Expected ConflictException');
        } catch (ConflictException $e) {
            $this->assertSame(['product' => 46, 'batch' => 46], $this->quantities());
        }

        // Reversing the write-off puts the stock back and reopens the report.
        $this->inventory->reverseTransaction($result['transaction'], $this->user);
        $this->assertSame(['product' => 50, 'batch' => 50], $this->quantities());
        $this->assertSame('investigated', $report->fresh()->status);
    }

    public function test_net_movement_uses_the_sign_of_adjustments(): void
    {
        $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'adjustment_quantity' => -6,
        ], $this->user);
        $this->inventory->adjustStock([
            'product_id' => $this->product->id,
            'adjustment_quantity' => 2,
        ], $this->user);

        $summary = $this->inventory->getStockMovementSummary(1);

        $this->assertSame(-4, $summary['net_movement']);
    }
}
