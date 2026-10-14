<?php

namespace App\Modules\Inventory\Controllers;

use App\Core\Controllers\BaseController;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\PhysicalCount;
use Illuminate\Http\JsonResponse;

class DashboardController extends BaseController
{
    /**
     * Get dashboard statistics
     */
    public function stats(): JsonResponse
    {
        $this->authorize('product.read');

        // 1. Total active products
        $totalProducts = Product::where('is_active', true)->count();

        // 2. Low stock count (products where current quantity <= reorder level)
        $lowStockCount = Product::where('is_active', true)
            ->whereColumn('quantity', '<=', 'reorder_level')
            ->count();

        // 3. Total inventory value (sum of batch quantity * unit cost for all batches with quantity > 0)
        $totalInventoryValue = Batch::where('quantity', '>', 0)
            ->with('product')
            ->get()
            ->sum(function ($batch) {
                $unitCost = $batch->unit_cost ?? $batch->product->unit_price;
                return $batch->quantity * $unitCost;
            });

        // 4. System accuracy (average of accuracy_percentage from recent physical counts)
        // If no counts exist, return 100.0 (assume perfect until proven otherwise)
        $systemAccuracy = PhysicalCount::where('count_date', '>=', now()->subDays(30))
            ->avg('accuracy_percentage') ?? 100.0;

        $data = [
            'total_products' => $totalProducts,
            'low_stock_count' => $lowStockCount,
            'total_inventory_value' => round($totalInventoryValue, 2),
            'system_accuracy' => round($systemAccuracy, 2),
        ];

        return $this->successResponse($data, 'Dashboard stats retrieved successfully');
    }
}
