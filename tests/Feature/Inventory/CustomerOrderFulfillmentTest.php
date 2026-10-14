<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\CustomerOrder;
use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Models\StockTransaction;
use App\Support\Enums\UserRole;
use App\Support\Enums\OrderStatus;
use App\Support\Enums\StockTransactionType;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CustomerOrderFulfillmentTest extends TestCase
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
            'batch_number' => 'BATCH-001',
            'expiry_date' => now()->addMonths(6),
        ]);
    }

    /** @test */
    public function warehouse_staff_can_fulfill_customer_order_with_allocated_reservation()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
            'order_number' => 'ORD-001',
        ]);

        $reservation = Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 20,
            'status' => 'allocated',
        ]);

        $initialProductQty = $this->product->quantity;
        $initialBatchQty = $this->batch->quantity;

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill", [
                'fulfilled_date' => now()->toDateString(),
                'notes' => 'Order picked and packed'
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Customer order fulfilled successfully'
            ]);

        // Verify order marked as fulfilled
        $order->refresh();
        $this->assertEquals(OrderStatus::FULFILLED, $order->status);
        $this->assertNotNull($order->fulfilled_date);

        // Verify reservation marked as fulfilled
        $reservation->refresh();
        $this->assertEquals('fulfilled', $reservation->status);
        $this->assertNotNull($reservation->fulfilled_at);

        // Verify stock decreased
        $this->product->refresh();
        $this->assertEquals($initialProductQty - 20, $this->product->quantity);

        $this->batch->refresh();
        $this->assertEquals($initialBatchQty - 20, $this->batch->quantity);

        // Verify stock transaction created
        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::OUT->value,
            'quantity' => 20,
            'reference_type' => 'customer_order',
            'reference_id' => $order->id,
            'reference_number' => 'ORD-001',
            'user_id' => $this->warehouseUser->id,
        ]);
    }

    /** @test */
    public function fulfilling_order_with_multiple_items_creates_multiple_transactions()
    {
        $product2 = Product::factory()->create(['quantity' => 50]);
        $batch2 = Batch::factory()->create([
            'product_id' => $product2->id,
            'quantity' => 50,
        ]);

        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        // Two reservations
        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 15,
            'status' => 'allocated',
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $product2->id,
            'batch_id' => $batch2->id,
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(200);

        // Verify two transactions created
        $transactions = StockTransaction::where('reference_id', $order->id)
            ->where('reference_type', 'customer_order')
            ->get();

        $this->assertCount(2, $transactions);

        // Verify both products decreased
        $this->product->refresh();
        $this->assertEquals(85, $this->product->quantity); // 100 - 15

        $product2->refresh();
        $this->assertEquals(40, $product2->quantity); // 50 - 10
    }

    /** @test */
    public function inventory_staff_can_also_fulfill_orders()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        $response = $this->actingAs($this->inventoryUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(200);
    }

    /** @test */
    public function manager_cannot_fulfill_orders()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        $response = $this->actingAs($this->managerUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(403);

        // Verify no changes
        $order->refresh();
        $this->assertEquals(OrderStatus::CONFIRMED, $order->status);
    }

    /** @test */
    public function cannot_fulfill_order_not_in_confirmed_status()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::PENDING,
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Only confirmed orders can be fulfilled'
            ]);
    }

    /** @test */
    public function cannot_fulfill_order_with_no_allocated_reservations()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        // Reservation exists but not allocated
        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'quantity' => 10,
            'status' => 'pending', // Not allocated
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Order has no allocated reservations to fulfill'
            ]);
    }

    /** @test */
    public function fulfillment_uses_correct_batch_from_reservation()
    {
        // Create another batch with earlier expiry (should be preferred by FEFO)
        $earlierBatch = Batch::factory()->create([
            'product_id' => $this->product->id,
            'quantity' => 50,
            'batch_number' => 'BATCH-EARLY',
            'expiry_date' => now()->addMonths(3), // Earlier than BATCH-001
        ]);

        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        // Reservation specifically allocated to the later batch
        $reservation = Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id, // Using BATCH-001, not the earlier one
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(200);

        // Verify the transaction used the allocated batch (not FEFO-selected batch)
        $transaction = StockTransaction::where('reference_id', $order->id)->first();
        $this->assertEquals($this->batch->id, $transaction->batch_id);
        $this->assertEquals('BATCH-001', $transaction->batch->batch_number);
    }

    /** @test */
    public function fulfillment_transaction_references_are_correct()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
            'order_number' => 'ORD-12345',
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill", [
                'notes' => 'Rush delivery'
            ]);

        $transaction = StockTransaction::where('reference_id', $order->id)->first();

        $this->assertNotNull($transaction);
        $this->assertEquals('customer_order', $transaction->reference_type);
        $this->assertEquals('ORD-12345', $transaction->reference_number);
        $this->assertStringContainsString('ORD-12345', $transaction->notes);
        $this->assertStringContainsString('Rush delivery', $transaction->notes);
    }

    /** @test */
    public function cannot_fulfill_already_fulfilled_order()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::FULFILLED,
            'fulfilled_date' => now()->subDay(),
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 10,
            'status' => 'fulfilled',
            'fulfilled_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(409);
    }

    /** @test */
    public function warehouse_can_get_picking_list()
    {
        // Create multiple orders with allocated reservations
        $order1 = CustomerOrder::factory()->create(['status' => OrderStatus::CONFIRMED]);
        $order2 = CustomerOrder::factory()->create(['status' => OrderStatus::CONFIRMED]);

        Reservation::factory()->create([
            'customer_order_id' => $order1->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 10,
            'status' => 'allocated',
        ]);

        Reservation::factory()->create([
            'customer_order_id' => $order2->id,
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'quantity' => 15,
            'status' => 'allocated',
        ]);

        $response = $this->actingAs($this->warehouseUser, 'sanctum')
            ->getJson("/api/v1/inventory/customer-orders/picking/list");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'generated_at',
                    'total_items',
                    'total_orders',
                    'items' => [
                        '*' => [
                            'order_number',
                            'customer_name',
                            'product_name',
                            'quantity',
                            'batch_number',
                            'bin_location',
                            'expiry_date',
                        ]
                    ]
                ]
            ]);

        $data = $response->json('data');
        $this->assertEquals(2, $data['total_items']);
        $this->assertEquals(2, $data['total_orders']);
    }

    /** @test */
    public function unauthenticated_user_cannot_fulfill_order()
    {
        $order = CustomerOrder::factory()->create([
            'status' => OrderStatus::CONFIRMED,
        ]);

        $response = $this->postJson("/api/v1/inventory/customer-orders/{$order->id}/fulfill");

        $response->assertStatus(401);
    }
}
