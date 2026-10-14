<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\Reservation;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\CustomerOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    public function definition(): array
    {
        $quantity = $this->faker->numberBetween(1, 50);
        $unitPrice = $this->faker->randomFloat(2, 100, 5000);

        return [
            'product_id' => Product::factory(),
            'customer_order_id' => CustomerOrder::factory(),
            'batch_id' => null,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'status' => $this->faker->randomElement(['pending', 'confirmed', 'allocated', 'fulfilled', 'cancelled']),
            'reserved_at' => now(),
            'expires_at' => now()->addHours(24),
            'fulfilled_at' => null,
            'reserved_by' => User::factory(),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'confirmed',
        ]);
    }

    public function allocated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'allocated',
            'batch_id' => Batch::factory(),
        ]);
    }

    public function fulfilled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'fulfilled',
            'batch_id' => Batch::factory(),
            'fulfilled_at' => now()->subDays(rand(1, 7)),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expires_at' => now()->subHours(rand(1, 48)),
            'status' => 'pending',
        ]);
    }
}
