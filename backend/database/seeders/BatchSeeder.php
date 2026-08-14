<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Support\Enums\BatchStatus;
use Carbon\Carbon;

class BatchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = Product::all();

        foreach ($products as $product) {
            // Create 2-3 batches per product for testing
            $batchCount = rand(2, 3);
            
            for ($i = 1; $i <= $batchCount; $i++) {
                $manufactureDate = Carbon::now()->subDays(rand(30, 365));
                $expiryDate = null;
                $status = BatchStatus::SAFE;

                // Only set expiry for certain product categories
                if (in_array($product->category, ['Food', 'Electronics']) || $product->shelf_life_days) {
                    $shelfLifeDays = $product->shelf_life_days ?? rand(365, 1095); // 1-3 years default
                    $expiryDate = $manufactureDate->copy()->addDays($shelfLifeDays);
                    
                    // Determine batch status based on expiry
                    $daysToExpiry = $expiryDate->diffInDays(Carbon::now());
                    
                    if ($daysToExpiry <= 0) {
                        $status = BatchStatus::EXPIRED;
                    } elseif ($daysToExpiry <= 60) {
                        $status = BatchStatus::WARNING;
                    }
                }

                $quantity = rand(1, intval($product->quantity / $batchCount) + 5);

                Batch::create([
                    'product_id' => $product->id,
                    'batch_number' => sprintf('BATCH-%04d-%03d', $product->id, $i),
                    'quantity' => $quantity,
                    'received_quantity' => $quantity,
                    'manufacture_date' => $manufactureDate,
                    'expiry_date' => $expiryDate,
                    'status' => $status->value,
                    'unit_cost' => $product->unit_price * 0.7, // Assume 30% markup
                    'supplier_batch_number' => sprintf('SUP-%04d-%03d', rand(1000, 9999), $i),
                ]);
            }
        }
    }
}