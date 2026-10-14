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
            'name'                  => fake()->company(),
            'code'                  => strtoupper(fake()->unique()->bothify('SUP-####')),
            'contact_person'        => fake()->name(),
            'email'                 => fake()->unique()->safeEmail(),
            'phone'                 => fake()->phoneNumber(),
            'address'               => fake()->streetAddress(),
            'city'                  => fake()->city(),
            'country'               => 'Philippines',
            'default_lead_time_days'=> fake()->numberBetween(3, 30),
            'credit_limit'          => fake()->randomFloat(2, 10000, 100000),
            'payment_terms'         => fake()->randomElement(['cash', 'net_15', 'net_30', 'net_60']),
            'is_active'             => true,
            'notes'                 => fake()->optional()->sentence(),
        ];
    }
}
