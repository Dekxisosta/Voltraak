<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Support\Enums\UserRole;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // ── Named demo accounts (used by LoginPage demo credentials) ──────
            [
                'name'       => 'System Administrator',
                'email'      => 'admin@voltraak.com',
                'password'   => Hash::make('admin123'),
                'role'       => UserRole::ADMIN,
                'phone'      => '+63 917 000 0001',
                'department' => 'Administration',
            ],
            [
                'name'       => 'Store Manager',
                'email'      => 'manager@voltraak.com',
                'password'   => Hash::make('manager123'),
                'role'       => UserRole::MANAGER,
                'phone'      => '+63 917 000 0002',
                'department' => 'Management',
            ],
            [
                'name'       => 'Inventory Staff',
                'email'      => 'inventory@voltraak.com',
                'password'   => Hash::make('inventory123'),
                'role'       => UserRole::INVENTORY_STAFF,
                'phone'      => '+63 917 000 0003',
                'department' => 'Inventory Management',
            ],
            [
                'name'       => 'Warehouse Worker',
                'email'      => 'warehouse@voltraak.com',
                'password'   => Hash::make('warehouse123'),
                'role'       => UserRole::WAREHOUSE,
                'phone'      => '+63 917 000 0004',
                'department' => 'Warehouse Operations',
            ],
            // ── Additional sample users ───────────────────────────────────────
            [
                'name'       => 'Joseph Cartagenas',
                'email'      => 'joseph@walangbrownout.com',
                'password'   => Hash::make('manager123'),
                'role'       => UserRole::MANAGER,
                'phone'      => '+63 917 123 4567',
                'department' => 'Management',
            ],
            [
                'name'       => 'Maria Santos',
                'email'      => 'maria@walangbrownout.com',
                'password'   => Hash::make('inventory123'),
                'role'       => UserRole::INVENTORY_STAFF,
                'phone'      => '+63 917 234 5678',
                'department' => 'Inventory Management',
            ],
            [
                'name'       => 'Juan Dela Cruz',
                'email'      => 'juan@walangbrownout.com',
                'password'   => Hash::make('warehouse123'),
                'role'       => UserRole::WAREHOUSE,
                'phone'      => '+63 917 345 6789',
                'department' => 'Warehouse Operations',
            ],
            [
                'name'       => 'Ana Rodriguez',
                'email'      => 'ana@walangbrownout.com',
                'password'   => Hash::make('password123'),
                'role'       => UserRole::INVENTORY_STAFF,
                'phone'      => '+63 917 456 7890',
                'department' => 'Inventory Management',
            ],
            [
                'name'       => 'Carlos Mendoza',
                'email'      => 'carlos@walangbrownout.com',
                'password'   => Hash::make('password123'),
                'role'       => UserRole::WAREHOUSE,
                'phone'      => '+63 917 567 8901',
                'department' => 'Warehouse Operations',
            ],
            [
                'name'       => 'Lisa Garcia',
                'email'      => 'lisa@walangbrownout.com',
                'password'   => Hash::make('password123'),
                'role'       => UserRole::WAREHOUSE,
                'phone'      => '+63 917 678 9012',
                'department' => 'Warehouse Operations',
            ],
            [
                'name'       => 'Inactive User',
                'email'      => 'inactive@walangbrownout.com',
                'password'   => Hash::make('password123'),
                'role'       => UserRole::WAREHOUSE,
                'phone'      => '+63 917 789 0123',
                'department' => 'Warehouse Operations',
                'is_active'  => false,
            ],
        ];

        foreach ($users as $data) {
            User::firstOrCreate(
                ['email' => $data['email']],
                array_merge([
                    'is_active'         => true,
                    'email_verified_at' => now(),
                    'last_login_at'     => now()->subDays(rand(0, 7)),
                ], $data)
            );
        }

        $this->command->info('Created ' . User::count() . ' users');
    }
}
