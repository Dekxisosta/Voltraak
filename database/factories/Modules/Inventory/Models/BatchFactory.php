<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\Product;
use App\Support\Enums\BatchStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class BatchFactory extends Factory
{
    protected $model = Batch::class;

    public function definition(): array
    {
        $manufactureDate = $this->faker->dateTimeBetween('-6 months', 'now');
        $expiryDate = $this->faker->dateTimeBetween('now', '+24 months');
        $quantity = $this->faker->numberBetween(10, 500);

        return [
            'product_id' => Product::factory(),
            'batch_number' => 'BTH-' . $this->faker->unique()->numerify('######'),
            'quantity' => $quantity,
            'received_quantity' => $quantity,
            'manufacture_date' => $manufactureDate,
            'expiry_date' => $expiryDate,
            'unit_cost' => $this->faker->randomFloat(2, 100, 5000),
            'supplier_batch_number' => $this->faker->optional()->bothify('SUP-####-???'),
            'status' => BatchStatus::SAFE,
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BatchStatus::SAFE,
            'expiry_date' => now()->addMonths(rand(6, 24)),
        ]);
    }

    public function warning(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BatchStatus::WARNING,
            'expiry_date' => now()->addDays(rand(30, 60)),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BatchStatus::EXPIRED,
            'expiry_date' => now()->subDays(rand(1, 30)),
        ]);
    }

    public function depleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BatchStatus::SAFE, // No DEPLETED status, use SAFE with 0 quantity
            'quantity' => 0,
        ]);
    }
}
