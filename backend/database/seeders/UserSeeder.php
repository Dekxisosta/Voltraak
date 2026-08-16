<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Support\Enums\UserRole;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default admin user
        User::create([
            'name' => 'System Administrator',
            'email' => 'admin@voltraak.com',
            'password' => 'admin123',
            'role' => UserRole::MANAGER,
            'phone' => '+63 917 000 0001',
            'department' => 'Administration',
            'is_active' => true,
            'email_verified_at' => now(),
            'last_login_at' => now(),
        ]);

        // Create sample manager
        User::create([
            'name' => 'Joseph Cartagenas',
            'email' => 'joseph@walangbrownout.com',
            'password' => 'manager123',
            'role' => UserRole::MANAGER,
            'phone' => '+63 917 123 4567',
            'department' => 'Management',
            'is_active' => true,
            'email_verified_at' => now(),
            'last_login_at' => now()->subHours(2),
        ]);

        // Create sample inventory staff
        User::create([
            'name' => 'Maria Santos',
            'email' => 'maria@walangbrownout.com',
            'password' => 'inventory123',
            'role' => UserRole::INVENTORY_STAFF,
            'phone' => '+63 917 234 5678',
            'department' => 'Inventory Management',
            'is_active' => true,
            'email_verified_at' => now(),
            'last_login_at' => now()->subDays(1),
        ]);

        // Create sample warehouse staff
        User::create([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@walangbrownout.com',
            'password' => 'warehouse123',
            'role' => UserRole::WAREHOUSE,
            'phone' => '+63 917 345 6789',
            'department' => 'Warehouse Operations',
            'is_active' => true,
            'email_verified_at' => now(),
            'last_login_at' => now()->subDays(2),
        ]);

        // Create additional test users for development
        $testUsers = [
            [
                'name' => 'Ana Rodriguez',
                'email' => 'ana@walangbrownout.com',
                'role' => UserRole::INVENTORY_STAFF,
                'department' => 'Inventory Management',
                'phone' => '+63 917 456 7890',
            ],
            [
                'name' => 'Carlos Mendoza',
                'email' => 'carlos@walangbrownout.com',
                'role' => UserRole::WAREHOUSE,
                'department' => 'Warehouse Operations',
                'phone' => '+63 917 567 8901',
            ],
            [
                'name' => 'Lisa Garcia',
                'email' => 'lisa@walangbrownout.com',
                'role' => UserRole::WAREHOUSE,
                'department' => 'Warehouse Operations',
                'phone' => '+63 917 678 9012',
            ],
        ];

        foreach ($testUsers as $userData) {
            User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => 'password123',
                'role' => $userData['role'],
                'phone' => $userData['phone'],
                'department' => $userData['department'],
                'is_active' => true,
                'email_verified_at' => now(),
                'last_login_at' => now()->subDays(rand(1, 7)),
            ]);
        }

        // Create one inactive user for testing
        User::create([
            'name' => 'Inactive User',
            'email' => 'inactive@walangbrownout.com',
            'password' => 'password123',
            'role' => UserRole::WAREHOUSE,
            'phone' => '+63 917 789 0123',
            'department' => 'Warehouse Operations',
            'is_active' => false,
            'email_verified_at' => now(),
            'last_login_at' => now()->subDays(30),
        ]);
        
        $this->command->info('Created ' . User::count() . ' test users');
    }
}