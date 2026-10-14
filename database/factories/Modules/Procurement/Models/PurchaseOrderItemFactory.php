<?php

namespace Database\Factories\Modules\Procurement\Models;

use App\Modules\Procurement\Models\PurchaseOrderItem;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Inventory\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderItemFactory extends Factory
{
    protected $model = PurchaseOrderItem::class;

    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(10, 100);
        $unitCost = $this->faker->randomFloat(2, 100, 5000);
        
        return [
            'purchase_order_id' => PurchaseOrder::factory(),
            'product_id' => Product::factory(),
            'quantity' => $quantity,
            'received_quantity' => 0,
            'unit_cost' => $unitCost,
            // total_cost is a generated column (quantity * unit_cost), don't set it
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function partiallyReceived(): static
    {
        return $this->state(function (array $attributes) {
            $quantity = $attributes['quantity'];
            $receivedQuantity = $this->faker->numberBetween(1, $quantity - 1);
            
            return [
                'received_quantity' => $receivedQuantity,
            ];
        });
    }

    public function fullyReceived(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'received_quantity' => $attributes['quantity'],
            ];
        });
    }
}
