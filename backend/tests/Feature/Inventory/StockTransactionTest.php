<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Procurement\Models\Supplier;
use App\Support\Enums\UserRole;
use App\Support\Enums\StockTransactionType;
use App\Support\Enums\BatchStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

class StockTransactionTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected string $token;
    protected Product $product;
    protected Batch $batch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');

        $this->user = User::factory()->create([
            'role' => UserRole::INVENTORY_STAFF,
        ]);
        $this->token = $this->user->createToken('test-token')->plainTextToken;

        $this->product = Product::factory()->create([
            'current_stock' => 100,
            'reserved_stock' => 10,
        ]);

        $supplier = Supplier::factory()->create();
        $this->batch = Batch::factory()->create([
            'product_id' => $this->product->id,
            'supplier_id' => $supplier->id,
            'quantity_available' => 50,
            'status' => BatchStatus::SAFE,
        ]);
    }

    /**
     * Test creating a stock-in transaction.
     */
    public function test_can_create_stock_in_transaction(): void
    {
        $transactionData = [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::STOCK_IN->value,
            'quantity' => 25,
            'unit_cost' => 199.99,
            'reference_number' => 'PO-2024-001',
            'notes' => 'Received from supplier',
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', $transactionData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'product_id',
                    'batch_id',
                    'type',
                    'quantity',
                    'unit_cost',
                    'total_cost',
                    'reference_number',
                    'notes',
                    'user_id',
                    'created_at',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'product_id' => $this->product->id,
                    'batch_id' => $this->batch->id,
                    'type' => 'stock_in',
                    'quantity' => 25,
                    'unit_cost' => 199.99,
                    'total_cost' => 4999.75,
                    'user_id' => $this->user->id,
                ],
            ]);

        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => 'stock_in',
            'quantity' => 25,
            'user_id' => $this->user->id,
        ]);

        // Verify stock levels updated
        $this->product->refresh();
        $this->assertEquals(125, $this->product->current_stock);

        $this->batch->refresh();
        $this->assertEquals(75, $this->batch->quantity_available);
    }

    /**
     * Test creating a stock-out transaction.
     */
    public function test_can_create_stock_out_transaction(): void
    {
        $transactionData = [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::STOCK_OUT->value,
            'quantity' => 15,
            'reference_number' => 'SO-2024-001',
            'notes' => 'Sold to customer',
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', $transactionData);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'type' => 'stock_out',
                    'quantity' => 15,
                ],
            ]);

        // Verify stock levels updated
        $this->product->refresh();
        $this->assertEquals(85, $this->product->current_stock);

        $this->batch->refresh();
        $this->assertEquals(35, $this->batch->quantity_available);
    }

    /**
     * Test stock-out transaction validation for insufficient stock.
     */
    public function test_cannot_create_stock_out_with_insufficient_stock(): void
    {
        $transactionData = [
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::STOCK_OUT->value,
            'quantity' => 60, // More than available in batch (50)
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', $transactionData);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Insufficient stock available in batch',
            ]);

        // Verify stock levels unchanged
        $this->product->refresh();
        $this->assertEquals(100, $this->product->current_stock);
    }

    /**
     * Test creating an adjustment transaction.
     */
    public function test_can_create_adjustment_transaction(): void
    {
        $transactionData = [
            'product_id' => $this->product->id,
            'type' => StockTransactionType::ADJUSTMENT->value,
            'quantity' => -5, // Negative adjustment
            'notes' => 'Physical count correction',
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', $transactionData);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'type' => 'adjustment',
                    'quantity' => -5,
                ],
            ]);

        // Verify stock adjusted
        $this->product->refresh();
        $this->assertEquals(95, $this->product->current_stock);
    }

    /**
     * Test listing stock transactions with filters.
     */
    public function test_can_list_stock_transactions(): void
    {
        // Create multiple transactions
        StockTransaction::factory(3)->create([
            'product_id' => $this->product->id,
            'type' => StockTransactionType::STOCK_IN,
        ]);
        StockTransaction::factory(2)->create([
            'product_id' => $this->product->id,
            'type' => StockTransactionType::STOCK_OUT,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/stock-transactions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'product_id',
                        'type',
                        'quantity',
                        'unit_cost',
                        'total_cost',
                        'reference_number',
                        'created_at',
                        'user' => ['name'],
                        'product' => ['name', 'sku'],
                    ],
                ],
                'meta',
            ]);
    }

    /**
     * Test filtering transactions by type.
     */
    public function test_can_filter_transactions_by_type(): void
    {
        StockTransaction::factory(2)->create([
            'product_id' => $this->product->id,
            'type' => StockTransactionType::STOCK_IN,
        ]);
        StockTransaction::factory(3)->create([
            'product_id' => $this->product->id,
            'type' => StockTransactionType::STOCK_OUT,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/stock-transactions?type=stock_in');

        $response->assertStatus(200);
        
        $transactions = $response->json('data');
        $this->assertCount(2, $transactions);
        
        foreach ($transactions as $transaction) {
            $this->assertEquals('stock_in', $transaction['type']);
        }
    }

    /**
     * Test filtering transactions by product.
     */
    public function test_can_filter_transactions_by_product(): void
    {
        $product2 = Product::factory()->create();

        StockTransaction::factory(2)->create(['product_id' => $this->product->id]);
        StockTransaction::factory(3)->create(['product_id' => $product2->id]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson("/api/inventory/stock-transactions?product_id={$this->product->id}");

        $response->assertStatus(200);
        
        $transactions = $response->json('data');
        $this->assertCount(2, $transactions);
        
        foreach ($transactions as $transaction) {
            $this->assertEquals($this->product->id, $transaction['product_id']);
        }
    }

    /**
     * Test viewing a single transaction.
     */
    public function test_can_view_single_transaction(): void
    {
        $transaction = StockTransaction::factory()->create([
            'product_id' => $this->product->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson("/api/inventory/stock-transactions/{$transaction->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'product_id',
                    'batch_id',
                    'type',
                    'quantity',
                    'unit_cost',
                    'total_cost',
                    'reference_number',
                    'notes',
                    'user_id',
                    'created_at',
                    'product',
                    'batch',
                    'user',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $transaction->id,
                    'product_id' => $this->product->id,
                ],
            ]);
    }

    /**
     * Test transaction validation.
     */
    public function test_transaction_creation_requires_validation(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'product_id',
                'type',
                'quantity',
            ]);
    }

    /**
     * Test FEFO compliance for stock-out transactions.
     */
    public function test_stock_out_enforces_fefo_compliance(): void
    {
        // Create batches with different expiry dates
        $earlyBatch = Batch::factory()->create([
            'product_id' => $this->product->id,
            'expiry_date' => now()->addDays(30),
            'quantity_available' => 20,
            'status' => BatchStatus::WARNING,
        ]);

        $lateBatch = Batch::factory()->create([
            'product_id' => $this->product->id,
            'expiry_date' => now()->addDays(60),
            'quantity_available' => 30,
            'status' => BatchStatus::SAFE,
        ]);

        // Try to create stock-out from late batch first
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/stock-transactions', [
            'product_id' => $this->product->id,
            'batch_id' => $lateBatch->id,
            'type' => StockTransactionType::STOCK_OUT->value,
            'quantity' => 10,
        ]);

        // Should fail FEFO validation
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'FEFO violation: Earlier expiring batches must be used first',
            ]);
    }

    /**
     * Test transaction history for audit trail.
     */
    public function test_maintains_transaction_history(): void
    {
        // Create various transactions
        StockTransaction::create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::STOCK_IN,
            'quantity' => 20,
            'unit_cost' => 100.00,
            'user_id' => $this->user->id,
        ]);

        StockTransaction::create([
            'product_id' => $this->product->id,
            'batch_id' => $this->batch->id,
            'type' => StockTransactionType::STOCK_OUT,
            'quantity' => 5,
            'user_id' => $this->user->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson("/api/inventory/products/{$this->product->id}/transaction-history");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'quantity',
                        'created_at',
                        'user' => ['name'],
                    ],
                ],
            ]);

        $transactions = $response->json('data');
        $this->assertCount(2, $transactions);
    }
}