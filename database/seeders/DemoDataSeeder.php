<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'email'    => 'admin@voltraak.com',
                'name'     => 'System Administrator',
                'password' => Hash::make('admin123'),
                'role'     => 'admin',
            ],
            [
                'email'    => 'manager@voltraak.com',
                'name'     => 'Store Manager',
                'password' => Hash::make('manager123'),
                'role'     => 'manager',
            ],
            [
                'email'    => 'inventory@voltraak.com',
                'name'     => 'Inventory Staff',
                'password' => Hash::make('inventory123'),
                'role'     => 'inventory_staff',
            ],
            [
                'email'    => 'warehouse@voltraak.com',
                'name'     => 'Warehouse Worker',
                'password' => Hash::make('warehouse123'),
                'role'     => 'warehouse',
            ],
        ];

        foreach ($users as $data) {
            User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'is_active'          => true,
                    'email_verified_at'  => now(),
                ])
            );
        }

        $this->command->info('Demo users created:');
        $this->command->info('  admin@voltraak.com      / admin123');
        $this->command->info('  manager@voltraak.com    / manager123');
        $this->command->info('  inventory@voltraak.com  / inventory123');
        $this->command->info('  warehouse@voltraak.com  / warehouse123');
    }
}
