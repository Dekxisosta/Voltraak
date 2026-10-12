<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Inventory\Models\Product;
use App\Support\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

class ProductTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');

        // Create authenticated user for tests
        $this->user = User::factory()->create([
            'role' => UserRole::MANAGER,
        ]);
        $this->token = $this->user->createToken('test-token')->plainTextToken;
    }

    /**
     * Test listing products with pagination.
     */
    public function test_can_list_products(): void
    {
        Product::factory(5)->create();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/products');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'sku',
                        'category',
                        'unit_of_measure',
                        'current_stock',
                        'available_stock',
                        'reorder_point',
                        'is_active',
                    ]
                ],
                'meta' => [
                    'current_page',
                    'per_page',
                    'total',
                ],
            ])
            ->assertJson(['success' => true]);
    }

    /**
     * Test creating a new product.
     */
    public function test_can_create_product(): void
    {
        $productData = [
            'name' => 'Samsung Galaxy S21',
            'sku' => 'SAM-GS21-128',
            'description' => 'Samsung Galaxy S21 128GB',
            'category' => 'Smartphones',
            'unit_of_measure' => 'pieces',
            'minimum_stock_level' => 10,
            'maximum_stock_level' => 100,
            'reorder_point' => 15,
            'is_active' => true,
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/products', $productData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'sku',
                    'category',
                    'current_stock',
                    'available_stock',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Samsung Galaxy S21',
                    'sku' => 'SAM-GS21-128',
                    'category' => 'Smartphones',
                ],
            ]);

        $this->assertDatabaseHas('products', [
            'name' => 'Samsung Galaxy S21',
            'sku' => 'SAM-GS21-128',
        ]);
    }

    /**
     * Test product creation validation.
     */
    public function test_product_creation_requires_validation(): void
    {
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/products', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'name',
                'sku',
                'category',
                'unit_of_measure',
            ]);
    }

    /**
     * Test SKU must be unique.
     */
    public function test_sku_must_be_unique(): void
    {
        Product::factory()->create(['sku' => 'UNIQUE-SKU']);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->postJson('/api/inventory/products', [
            'name' => 'Test Product',
            'sku' => 'UNIQUE-SKU', // Duplicate SKU
            'category' => 'Test',
            'unit_of_measure' => 'pieces',
            'minimum_stock_level' => 1,
            'maximum_stock_level' => 10,
            'reorder_point' => 5,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    /**
     * Test viewing a single product.
     */
    public function test_can_view_single_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson("/api/inventory/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'name',
                    'sku',
                    'description',
                    'category',
                    'unit_of_measure',
                    'minimum_stock_level',
                    'maximum_stock_level',
                    'reorder_point',
                    'current_stock',
                    'reserved_stock',
                    'available_stock',
                    'total_value',
                    'average_cost',
                    'is_active',
                    'created_at',
                    'updated_at',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                ],
            ]);
    }

    /**
     * Test updating a product.
     */
    public function test_can_update_product(): void
    {
        $product = Product::factory()->create([
            'name' => 'Original Name',
            'reorder_point' => 10,
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'reorder_point' => 15,
            'is_active' => false,
        ];

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->putJson("/api/inventory/products/{$product->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $product->id,
                    'name' => 'Updated Name',
                    'reorder_point' => 15,
                    'is_active' => false,
                ],
            ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Name',
            'reorder_point' => 15,
            'is_active' => false,
        ]);
    }

    /**
     * Test deleting a product.
     */
    public function test_can_delete_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->deleteJson("/api/inventory/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Product deleted successfully',
            ]);

        $this->assertSoftDeleted('products', [
            'id' => $product->id,
        ]);
    }

    /**
     * Test searching products by name.
     */
    public function test_can_search_products(): void
    {
        Product::factory()->create(['name' => 'Samsung Galaxy S21']);
        Product::factory()->create(['name' => 'iPhone 14 Pro']);
        Product::factory()->create(['name' => 'Samsung Galaxy Tab']);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/products?search=Samsung');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $products = $response->json('data');
        $this->assertCount(2, $products);
        
        foreach ($products as $product) {
            $this->assertStringContainsString('Samsung', $product['name']);
        }
    }

    /**
     * Test filtering products by category.
     */
    public function test_can_filter_products_by_category(): void
    {
        Product::factory()->create(['category' => 'Smartphones']);
        Product::factory()->create(['category' => 'Smartphones']);
        Product::factory()->create(['category' => 'Tablets']);

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/products?category=Smartphones');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $products = $response->json('data');
        $this->assertCount(2, $products);
        
        foreach ($products as $product) {
            $this->assertEquals('Smartphones', $product['category']);
        }
    }

    /**
     * Test low stock products endpoint.
     */
    public function test_can_get_low_stock_products(): void
    {
        // Create products with different stock levels
        Product::factory()->create([
            'reorder_point' => 10,
            'minimum_stock_level' => 5,
        ])->update(['current_stock' => 3]); // Below minimum

        Product::factory()->create([
            'reorder_point' => 15,
            'minimum_stock_level' => 8,
        ])->update(['current_stock' => 12]); // Between minimum and reorder point

        Product::factory()->create([
            'reorder_point' => 20,
            'minimum_stock_level' => 10,
        ])->update(['current_stock' => 25]); // Above reorder point

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$this->token}",
        ])->getJson('/api/inventory/products/low-stock');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $lowStockProducts = $response->json('data');
        $this->assertCount(2, $lowStockProducts);
    }

    /**
     * Test unauthorized access.
     */
    public function test_requires_authentication(): void
    {
        $response = $this->getJson('/api/inventory/products');
        $response->assertStatus(401);
    }

    /**
     * Test role-based access control.
     */
    public function test_warehouse_staff_has_limited_access(): void
    {
        $warehouseUser = User::factory()->create([
            'role' => UserRole::WAREHOUSE,
        ]);
        $warehouseToken = $warehouseUser->createToken('test-token')->plainTextToken;

        // Can view products
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$warehouseToken}",
        ])->getJson('/api/inventory/products');
        $response->assertStatus(200);

        // Cannot create products (assuming manager-only access)
        $response = $this->withHeaders([
            'Authorization' => "Bearer {$warehouseToken}",
        ])->postJson('/api/inventory/products', [
            'name' => 'Test Product',
            'sku' => 'TEST-001',
            'category' => 'Test',
            'unit_of_measure' => 'pieces',
        ]);
        $response->assertStatus(403);
    }
}