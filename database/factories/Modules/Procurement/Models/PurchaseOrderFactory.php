<?php

namespace Database\Factories\Modules\Procurement\Models;

use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\Supplier;
use App\Models\User;
use App\Support\Enums\PurchaseOrderStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    protected $model = PurchaseOrder::class;

    public function definition(): array
    {
        $orderDate = $this->faker->dateTimeBetween('-3 months', 'now');
        $expectedDelivery = $this->faker->dateTimeBetween($orderDate, '+2 months');

        return [
            'po_number' => 'PO-' . $this->faker->unique()->numerify('####-###'),
            'supplier_id' => Supplier::factory(),
            'status' => $this->faker->randomElement(PurchaseOrderStatus::cases()),
            'order_date' => $orderDate,
            'expected_delivery_date' => $expectedDelivery,
            'actual_delivery_date' => null,
            'total_amount' => $this->faker->randomFloat(2, 5000, 100000),
            'total_items' => $this->faker->numberBetween(10, 500),
            'created_by' => User::factory(),
            'approved_by' => null,
            'approved_at' => null,
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::DRAFT,
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::PENDING,
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::APPROVED,
            'approved_by' => User::factory(),
            'approved_at' => now()->subDays(rand(1, 7)),
        ]);
    }

    public function sent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::SENT,
            'approved_by' => User::factory(),
            'approved_at' => now()->subDays(rand(3, 14)),
        ]);
    }

    public function received(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::RECEIVED,
            'approved_by' => User::factory(),
            'approved_at' => now()->subDays(rand(7, 21)),
            'actual_delivery_date' => now()->subDays(rand(1, 5)),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::COMPLETED,
            'approved_by' => User::factory(),
            'approved_at' => now()->subDays(rand(7, 21)),
            'actual_delivery_date' => now()->subDays(rand(1, 5)),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => PurchaseOrderStatus::CANCELLED,
        ]);
    }
}
