<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Inventory\Models\Product;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Samsung 32" Smart TV',
                'sku' => 'SAM-TV-32-001',
                'category' => 'Television',
                'description' => '32-inch LED Smart TV with WiFi capability',
                'unit_price' => 18500.00,
                'quantity' => 25,
                'reorder_level' => 5,
                'max_stock_level' => 50,
                'is_seasonal' => false,
                'shelf_life_days' => null,
                'storage_bin' => 'A-01-A',
                'barcode' => '1234567890123',
            ],
            [
                'name' => 'LG 1.5HP Inverter Aircon',
                'sku' => 'LG-AC-15-INV',
                'category' => 'Air Conditioning',
                'description' => '1.5HP Inverter Split Type Air Conditioner',
                'unit_price' => 32000.00,
                'quantity' => 15,
                'reorder_level' => 3,
                'max_stock_level' => 25,
                'is_seasonal' => true,
                'shelf_life_days' => null,
                'storage_bin' => 'B-01-A',
                'barcode' => '2345678901234',
            ],
            [
                'name' => 'Panasonic 7kg Washing Machine',
                'sku' => 'PAN-WM-7KG-001',
                'category' => 'Laundry',
                'description' => '7kg Front Load Washing Machine with Eco Mode',
                'unit_price' => 28000.00,
                'quantity' => 12,
                'reorder_level' => 2,
                'max_stock_level' => 20,
                'is_seasonal' => false,
                'shelf_life_days' => null,
                'storage_bin' => 'C-01-A',
                'barcode' => '3456789012345',
            ],
            [
                'name' => 'Sharp 8.5cuft Refrigerator',
                'sku' => 'SHP-REF-85-001',
                'category' => 'Refrigeration',
                'description' => '8.5 cubic feet No Frost Refrigerator',
                'unit_price' => 22000.00,
                'quantity' => 8,
                'reorder_level' => 2,
                'max_stock_level' => 15,
                'is_seasonal' => false,
                'shelf_life_days' => null,
                'storage_bin' => 'D-01-A',
                'barcode' => '4567890123456',
            ],
            [
                'name' => 'Hanabishi Electric Fan 16"',
                'sku' => 'HAN-FAN-16-001',
                'category' => 'Cooling',
                'description' => '16-inch Stand Fan with Remote Control',
                'unit_price' => 3500.00,
                'quantity' => 50,
                'reorder_level' => 10,
                'max_stock_level' => 100,
                'is_seasonal' => true,
                'shelf_life_days' => null,
                'storage_bin' => 'E-01-A',
                'barcode' => '5678901234567',
            ],
            [
                'name' => 'Kolin Water Dispenser Hot/Cold',
                'sku' => 'KOL-WD-HC-001',
                'category' => 'Water Appliances',
                'description' => 'Hot and Cold Water Dispenser with Storage Cabinet',
                'unit_price' => 8500.00,
                'quantity' => 20,
                'reorder_level' => 4,
                'max_stock_level' => 30,
                'is_seasonal' => false,
                'shelf_life_days' => null,
                'storage_bin' => 'F-01-A',
                'barcode' => '6789012345678',
            ]
        ];

        foreach ($products as $productData) {
            Product::create($productData);
        }

        // Create additional test products for development
        if (app()->environment(['local', 'development'])) {
            Product::factory(50)->create();
        }
    }
}