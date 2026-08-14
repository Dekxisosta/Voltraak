<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Procurement\Models\Supplier;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'ABC Electronics Corp',
                'code' => 'ABC001',
                'contact_person' => 'Roberto Garcia',
                'email' => 'sales@abcelectronics.com',
                'phone' => '(02) 8555-1234',
                'address' => '123 Makati Ave, Makati City',
                'city' => 'Makati City',
                'default_lead_time_days' => 7,
                'payment_terms' => 'net_30',
            ],
            [
                'name' => 'Metro Appliance Supply',
                'code' => 'MAS001',
                'contact_person' => 'Carmen Rodriguez',
                'email' => 'procurement@metroappliance.ph',
                'phone' => '(02) 8777-5678',
                'address' => '456 Ortigas Center, Pasig City',
                'city' => 'Pasig City',
                'default_lead_time_days' => 5,
                'payment_terms' => 'net_15',
            ],
            [
                'name' => 'Island Home Distributors',
                'code' => 'IHD001',
                'contact_person' => 'Fernando Cruz',
                'email' => 'orders@islandhome.com',
                'phone' => '(032) 234-5678',
                'address' => '789 Cebu Business Park, Cebu City',
                'city' => 'Cebu City',
                'default_lead_time_days' => 10,
                'payment_terms' => 'net_30',
            ],
            [
                'name' => 'Northern Luzon Trading',
                'code' => 'NLT001',
                'contact_person' => 'Anna Mercado',
                'email' => 'sales@northernluzon.ph',
                'phone' => '(074) 442-1234',
                'address' => '321 Session Road, Baguio City',
                'city' => 'Baguio City',
                'default_lead_time_days' => 14,
                'payment_terms' => 'cash',
            ],
        ];

        foreach ($suppliers as $supplierData) {
            Supplier::create($supplierData);
        }

        // Create additional test suppliers for development
        if (app()->environment(['local', 'development'])) {
            Supplier::factory(10)->create();
        }
    }
}