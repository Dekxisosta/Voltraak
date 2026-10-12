<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DemoDataSeeder extends Seeder
{
    /**
     * Seed demo data for Voltraak IMS
     */
    public function run(): void
    {
        // Create admin user
        User::firstOrCreate(
            ['email' => 'admin@voltraak.com'],
            [
                'name' => 'System Administrator',
                'email' => 'admin@voltraak.com',
                'password' => Hash::make('admin123'),
                'role' => 'manager',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Create manager user
        User::firstOrCreate(
            ['email' => 'manager@voltraak.com'],
            [
                'name' => 'Store Manager',
                'email' => 'manager@voltraak.com',
                'password' => Hash::make('manager123'),
                'role' => 'manager',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Create inventory staff user
        User::firstOrCreate(
            ['email' => 'inventory@voltraak.com'],
            [
                'name' => 'Inventory Staff',
                'email' => 'inventory@voltraak.com',
                'password' => Hash::make('inventory123'),
                'role' => 'inventory_staff',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Create warehouse user
        User::firstOrCreate(
            ['email' => 'warehouse@voltraak.com'],
            [
                'name' => 'Warehouse Worker',
                'email' => 'warehouse@voltraak.com',
                'password' => Hash::make('warehouse123'),
                'role' => 'warehouse',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Demo users created successfully!');
        $this->command->info('Login credentials:');
        $this->command->info('Admin: admin@voltraak.com / admin123');
        $this->command->info('Manager: manager@voltraak.com / manager123');
        $this->command->info('Inventory: inventory@voltraak.com / inventory123');
        $this->command->info('Warehouse: warehouse@voltraak.com / warehouse123');
    }
}