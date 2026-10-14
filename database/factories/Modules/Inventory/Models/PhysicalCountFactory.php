<?php

namespace Database\Factories\Modules\Inventory\Models;

use App\Modules\Inventory\Models\PhysicalCount;
use App\Modules\Inventory\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PhysicalCountFactory extends Factory
{
    protected $model = PhysicalCount::class;

    public function definition(): array
    {
        $systemQuantity = $this->faker->numberBetween(50, 500);
        // Generate realistic variance (most counts are accurate)
        $variancePercent = $this->faker->randomFloat(2, -10, 10); // -10% to +10%
        $countedQuantity = (int) round($systemQuantity * (1 + ($variancePercent / 100)));

        return [
            'product_id' => Product::factory(),
            'counted_by' => User::factory(),
            'system_quantity' => $systemQuantity,
            'counted_quantity' => max(0, $countedQuantity), // Never negative
            'count_reference' => 'CNT-' . $this->faker->unique()->numerify('####-###'),
            'notes' => $this->faker->optional()->sentence(),
            'count_date' => $this->faker->dateTimeBetween('-30 days', 'now'),
            'variance_approved' => false,
            'approved_by' => null,
            'approved_at' => null,
            'adjustment_transaction_id' => null,
            'approval_notes' => null,
        ];
    }

    public function perfect(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'counted_quantity' => $attributes['system_quantity'],
            ];
        });
    }

    public function withShrinkage(int $units = null): static
    {
        return $this->state(function (array $attributes) use ($units) {
            $shrinkage = $units ?? $this->faker->numberBetween(5, 50);
            return [
                'counted_quantity' => max(0, $attributes['system_quantity'] - $shrinkage),
            ];
        });
    }

    public function withOverage(int $units = null): static
    {
        return $this->state(function (array $attributes) use ($units) {
            $overage = $units ?? $this->faker->numberBetween(5, 50);
            return [
                'counted_quantity' => $attributes['system_quantity'] + $overage,
            ];
        });
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'variance_approved' => true,
            'approved_by' => User::factory(),
            'approved_at' => now()->subDays(rand(0, 7)),
            'approval_notes' => 'Variance approved',
        ]);
    }

    public function pendingApproval(): static
    {
        return $this->state(fn (array $attributes) => [
            'variance_approved' => false,
        ]);
    }

    public function exceedsThreshold(float $threshold = 5.0): static
    {
        return $this->state(function (array $attributes) use ($threshold) {
            $systemQty = $attributes['system_quantity'];
            // Generate variance that exceeds threshold
            $variancePercent = $this->faker->randomElement([
                $threshold + $this->faker->randomFloat(2, 1, 10),
                -($threshold + $this->faker->randomFloat(2, 1, 10))
            ]);
            
            return [
                'counted_quantity' => (int) round($systemQty * (1 + ($variancePercent / 100))),
                'exceeds_threshold' => true,
                'threshold_used' => $threshold,
            ];
        });
    }
}
