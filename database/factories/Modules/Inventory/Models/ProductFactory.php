<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $names = [
            'Samsung Refrigerator 21cu', 'LG Washing Machine 8kg', 'Sony LED TV 55"',
            'Panasonic Microwave 1.2cu', 'Sharp Air Conditioner 1.5HP', 'Philips Rice Cooker 1.8L',
            'Electrolux Oven 40L', 'Condura Freezer 8cu', 'Haier Water Dispenser',
            'Hanabishi Electric Fan 16"', 'Imarflex Blender 1.5L', 'American Home Toaster'
        ];
        
        $name = fake()->randomElement($names);
        
        return [
            'name' => $name,
            'sku' => fake()->unique()->bothify('SKU-####-??'),
            'description' => fake()->sentence(),
            'category' => fake()->randomElement(['Appliances', 'Electronics', 'Furniture']),
            'unit_price' => fake()->randomFloat(2, 500, 50000),
            'quantity' => fake()->numberBetween(0, 100),
            'reorder_level' => fake()->numberBetween(5, 20),
            'max_stock_level' => fake()->numberBetween(100, 200),
            'storage_bin' => fake()->bothify('BIN-??-###'),
            'is_active' => true,
        ];
    }
}
