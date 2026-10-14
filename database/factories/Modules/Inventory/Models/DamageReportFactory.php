<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\DamageReport;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Models\User;
use App\Support\Enums\DamageType;
use Illuminate\Database\Eloquent\Factories\Factory;

class DamageReportFactory extends Factory
{
    protected $model = DamageReport::class;

    public function definition(): array
    {
        $quantityDamaged = $this->faker->numberBetween(1, 50);
        $unitCost = $this->faker->randomFloat(2, 100, 5000);

        return [
            'product_id' => Product::factory(),
            'batch_id' => null,
            'quantity_damaged' => $quantityDamaged,
            'damage_type' => $this->faker->randomElement(DamageType::cases()),
            'description' => $this->faker->sentence(),
            'estimated_value' => $quantityDamaged * $unitCost,
            'photo_path' => $this->faker->optional()->filePath(),
            'status' => $this->faker->randomElement(['reported', 'investigated', 'approved', 'written_off']),
            'reported_by' => User::factory(),
            'investigated_by' => null,
            'reported_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
            'investigated_at' => null,
            'investigation_notes' => null,
            'action_taken' => null,
        ];
    }

    public function reported(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'reported',
            'investigated_by' => null,
            'investigated_at' => null,
        ]);
    }

    public function investigating(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'reported', // 'investigating' status doesn't exist, use 'reported'
            'investigated_by' => User::factory(),
        ]);
    }

    public function investigated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'investigated',
            'investigated_by' => User::factory(),
            'investigated_at' => now()->subDays(rand(1, 7)),
            'investigation_notes' => $this->faker->paragraph(),
            'action_taken' => $this->faker->sentence(),
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'investigated_by' => User::factory(),
            'investigated_at' => now()->subDays(rand(3, 10)),
            'investigation_notes' => $this->faker->paragraph(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'investigated', // Use 'investigated' instead of 'rejected'
            'investigated_by' => User::factory(),
            'investigated_at' => now()->subDays(rand(1, 7)),
            'investigation_notes' => $this->faker->paragraph() . "\n\nRejection reason: " . $this->faker->sentence(),
        ]);
    }

    public function withBatch(): static
    {
        return $this->state(fn (array $attributes) => [
            'batch_id' => Batch::factory(),
        ]);
    }

    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'reported',
            'reported_at' => now()->subDays(rand(8, 30)),
        ]);
    }
}
