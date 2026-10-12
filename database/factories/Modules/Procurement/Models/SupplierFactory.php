<?php

namespace Database\Factories\Modules\Procurement\Models;

use App\Modules\Procurement\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'contact_person' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'postal_code' => fake()->postcode(),
            'country' => 'Philippines',
            'tax_id' => fake()->numerify('###-###-###-###'),
            'payment_terms' => fake()->randomElement([7, 15, 30, 45, 60]),
            'lead_time_days' => fake()->numberBetween(3, 30),
            'minimum_order_value' => fake()->randomFloat(2, 1000, 10000),
            'category' => fake()->randomElement(['Appliances', 'Electronics', 'Furniture', 'Hardware']),
            'rating' => fake()->randomFloat(2, 3, 5),
            'total_orders' => 0,
            'is_active' => true,
        ];
    }
}
