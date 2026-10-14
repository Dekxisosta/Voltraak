<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\CustomerOrder;
use App\Models\User;
use App\Support\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerOrderFactory extends Factory
{
    protected $model = CustomerOrder::class;

    public function definition(): array
    {
        $orderDate = $this->faker->dateTimeBetween('-30 days', 'now');
        $requiredDate = $this->faker->dateTimeBetween($orderDate, '+30 days');

        return [
            'order_number' => 'ORD-' . $this->faker->unique()->numerify('########'),
            'customer_name' => $this->faker->company(),
            'customer_email' => $this->faker->safeEmail(),
            'customer_phone' => $this->faker->phoneNumber(),
            'customer_address' => $this->faker->address(),
            'status' => $this->faker->randomElement(OrderStatus::cases()),
            'total_amount' => $this->faker->randomFloat(2, 1000, 50000),
            'total_items' => $this->faker->numberBetween(1, 10),
            'required_date' => $requiredDate,
            'fulfilled_date' => null,
            'created_by' => User::factory(),
            'notes' => $this->faker->optional()->sentence(),
            'order_date' => $orderDate,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::PENDING,
        ]);
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::CONFIRMED,
        ]);
    }

    public function fulfilled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::FULFILLED,
            'fulfilled_date' => now()->subDays(rand(1, 7)),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::CANCELLED,
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'required_date' => now()->subDays(rand(1, 10)),
            'status' => OrderStatus::CONFIRMED,
        ]);
    }
}
