<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DemoDataSeeder::class,
            UserSeeder::class,
            SupplierSeeder::class,
            ProductSeeder::class,
            BatchSeeder::class,
        ]);
    }
}