<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Inventory\Controllers\ProductController;
use App\Modules\Inventory\Controllers\BatchController;
use App\Modules\Inventory\Controllers\StockTransactionController;
use App\Modules\Inventory\Controllers\PhysicalCountController;
use App\Modules\Inventory\Controllers\ReservationController;
use App\Modules\Inventory\Controllers\DashboardController;

/*
|--------------------------------------------------------------------------
| Inventory API Routes
|--------------------------------------------------------------------------
|
| Here are the API routes for the Inventory module.
| All routes are prefixed with 'api/inventory' and require authentication.
|
*/

Route::middleware(['auth:sanctum'])->prefix('inventory')->name('inventory.')->group(function () {
    
    /*
    |--------------------------------------------------------------------------
    | Product Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('products')->name('products.')->group(function () {
        // Standard CRUD
        Route::get('/', [ProductController::class, 'index'])->name('index');
        Route::post('/', [ProductController::class, 'store'])->name('store');
        Route::get('/{product}', [ProductController::class, 'show'])->name('show');
        Route::put('/{product}', [ProductController::class, 'update'])->name('update');
        Route::delete('/{product}', [ProductController::class, 'destroy'])->name('destroy');
        
        // Product-specific endpoints
        Route::get('/{product}/stock-levels', [ProductController::class, 'stockLevels'])->name('stock-levels');
        Route::put('/{product}/reorder-point', [ProductController::class, 'updateReorderPoint'])->name('update-reorder-point');
        
        // Product collections
        Route::get('/status/low-stock', [ProductController::class, 'lowStock'])->name('low-stock');
        Route::get('/status/out-of-stock', [ProductController::class, 'outOfStock'])->name('out-of-stock');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Batch Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('batches')->name('batches.')->group(function () {
        // Standard CRUD
        Route::get('/', [BatchController::class, 'index'])->name('index');
        Route::post('/', [BatchController::class, 'store'])->name('store');
        Route::get('/{batch}', [BatchController::class, 'show'])->name('show');
        Route::put('/{batch}', [BatchController::class, 'update'])->name('update');
        Route::delete('/{batch}', [BatchController::class, 'destroy'])->name('destroy');
        
        // Batch-specific endpoints
        Route::get('/{batch}/history', [BatchController::class, 'history'])->name('history');
        Route::post('/{batch}/reserve', [BatchController::class, 'reserve'])->name('reserve');
        Route::delete('/{batch}/reservation', [BatchController::class, 'releaseReservation'])->name('release-reservation');
        Route::patch('/{batch}/mark-expired', [BatchController::class, 'markExpired'])->name('mark-expired');
        Route::patch('/{batch}/prioritize', [BatchController::class, 'prioritize'])->name('prioritize');
        
        // Batch collections
        Route::get('/status/expiring-soon', [BatchController::class, 'expiringSoon'])->name('expiring-soon');
        Route::get('/status/expired', [BatchController::class, 'expired'])->name('expired');
        
        // FEFO operations
        Route::get('/fefo/recommendations', [BatchController::class, 'fefoRecommendations'])->name('fefo-recommendations');
        Route::get('/fefo/picking-order', [BatchController::class, 'fefoOrder'])->name('fefo-order');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Stock Transaction Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('stock-transactions')->name('stock-transactions.')->group(function () {
        // Read operations
        Route::get('/', [StockTransactionController::class, 'index'])->name('index');
        Route::get('/{stockTransaction}', [StockTransactionController::class, 'show'])->name('show');
        
        // Stock movements
        Route::post('/stock-in', [StockTransactionController::class, 'stockIn'])->name('stock-in');
        Route::post('/stock-out', [StockTransactionController::class, 'stockOut'])->name('stock-out');
        Route::post('/{stockTransaction}/reverse', [StockTransactionController::class, 'reverse'])->name('reverse');
        
        // History and reporting
        Route::get('/history/product', [StockTransactionController::class, 'productHistory'])->name('product-history');
        Route::get('/history/batch', [StockTransactionController::class, 'batchHistory'])->name('batch-history');
        Route::get('/history/user', [StockTransactionController::class, 'userHistory'])->name('user-history');
        
        // Transaction types
        Route::get('/type/{type}', [StockTransactionController::class, 'byType'])->name('by-type');
        
        // Analytics
        Route::get('/analytics/daily-summary', [StockTransactionController::class, 'dailySummary'])->name('daily-summary');
        Route::get('/analytics/statistics', [StockTransactionController::class, 'statistics'])->name('statistics');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Physical Count Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('physical-counts')->name('physical-counts.')->group(function () {
        // Standard CRUD
        Route::get('/', [PhysicalCountController::class, 'index'])->name('index');
        Route::post('/', [PhysicalCountController::class, 'store'])->name('store');
        Route::get('/{physicalCount}', [PhysicalCountController::class, 'show'])->name('show');
        Route::put('/{physicalCount}', [PhysicalCountController::class, 'update'])->name('update');
        Route::delete('/{physicalCount}', [PhysicalCountController::class, 'destroy'])->name('destroy');
        
        // Count-specific operations
        Route::post('/{physicalCount}/approve-variance', [PhysicalCountController::class, 'approveVariance'])
            ->middleware('role:manager,admin')
            ->name('approve-variance');
        Route::post('/{physicalCount}/reject-variance', [PhysicalCountController::class, 'rejectVariance'])
            ->middleware('role:manager,admin')
            ->name('reject-variance');
        
        // Count collections
        Route::get('/status/with-variance', [PhysicalCountController::class, 'withVariance'])->name('with-variance');
        Route::get('/status/recent', [PhysicalCountController::class, 'recent'])->name('recent');
        
        // Count management
        Route::post('/generate-worksheet', [PhysicalCountController::class, 'generateWorksheet'])->name('generate-worksheet');
        Route::post('/import-results', [PhysicalCountController::class, 'importResults'])->name('import-results');
        
        // Analytics
        Route::get('/analytics/statistics', [PhysicalCountController::class, 'statistics'])->name('statistics');
        Route::get('/analytics/accuracy', [PhysicalCountController::class, 'accuracy'])->name('accuracy');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Customer Order / Fulfillment Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('customer-orders')->name('customer-orders.')->group(function () {
        // Standard CRUD
        Route::get('/', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'index'])->name('index');
        Route::post('/', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'store'])->name('store');
        Route::get('/{customerOrder}', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'show'])->name('show');
        Route::put('/{customerOrder}', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'update'])->name('update');
        Route::delete('/{customerOrder}', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'destroy'])->name('destroy');
        
        // Fulfillment operations
        Route::post('/{customerOrder}/confirm', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'confirm'])->name('confirm');
        Route::post('/{customerOrder}/fulfill', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'fulfill'])
            ->middleware('role:warehouse,inventory_staff,admin')
            ->name('fulfill');
        Route::post('/{customerOrder}/cancel', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'cancel'])->name('cancel');
        
        // Picking list for warehouse
        Route::get('/picking/list', [\App\Modules\Inventory\Controllers\CustomerOrderController::class, 'pickingList'])
            ->middleware('role:warehouse,inventory_staff,admin')
            ->name('picking-list');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Reservation Routes
    |--------------------------------------------------------------------------
    | Reservations are created through customer orders; this exposes them for
    | the inventory staff reservations page (list + release).
    */
    Route::prefix('reservations')->name('reservations.')->group(function () {
        Route::get('/', [ReservationController::class, 'index'])->name('index');
        Route::post('/{reservation}/cancel', [ReservationController::class, 'cancel'])->name('cancel');
    });

    /*
    |--------------------------------------------------------------------------
    | Damage Report Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('damage-reports')->name('damage-reports.')->group(function () {
        // Standard CRUD
        Route::get('/', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'index'])->name('index');
        Route::post('/', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'store'])->name('store');
        Route::get('/{damageReport}', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'show'])->name('show');
        Route::put('/{damageReport}', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'update'])->name('update');
        Route::delete('/{damageReport}', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'destroy'])->name('destroy');
        
        // Investigation workflow
        Route::post('/{damageReport}/assign-investigator', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'assignInvestigator'])
            ->middleware('role:manager,inventory_staff,admin')
            ->name('assign-investigator');
        Route::post('/{damageReport}/complete-investigation', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'completeInvestigation'])
            ->middleware('role:manager,inventory_staff,admin')
            ->name('complete-investigation');
        
        // Approval workflow
        Route::post('/{damageReport}/approve', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'approve'])
            ->middleware('role:manager,admin')
            ->name('approve');
        Route::post('/{damageReport}/reject', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'reject'])
            ->middleware('role:manager,admin')
            ->name('reject');
        
        // Collections
        Route::get('/status/pending-review', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'pendingReview'])->name('pending-review');
        
        // Analytics
        Route::get('/analytics/statistics', [\App\Modules\Inventory\Controllers\DamageReportController::class, 'statistics'])->name('statistics');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Discrepancy Report Routes  
    |--------------------------------------------------------------------------
    */
    Route::prefix('discrepancy-reports')->name('discrepancy-reports.')->group(function () {
        // Standard CRUD
        Route::get('/', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'index'])->name('index');
        Route::post('/', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'store'])->name('store');
        Route::get('/{discrepancyReport}', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'show'])->name('show');

        // Investigation workflow (inventory staff)
        Route::patch('/{discrepancyReport}/status', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'updateStatus'])->name('update-status');
        Route::post('/{discrepancyReport}/send-for-approval', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'sendForApproval'])->name('send-for-approval');
        
        // Approval workflow
        Route::post('/{discrepancyReport}/approve', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'approve'])
            ->middleware('role:manager,admin')
            ->name('approve');
        Route::post('/{discrepancyReport}/reject', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'reject'])
            ->middleware('role:manager,admin')
            ->name('reject');
        
        // Analytics
        Route::get('/analytics/statistics', [\App\Modules\Inventory\Controllers\DiscrepancyReportController::class, 'statistics'])->name('statistics');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Cross-Module Routes
    |--------------------------------------------------------------------------
    */
    
    // Dashboard data (aggregated inventory metrics)
    Route::prefix('dashboard')->name('dashboard.')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats'])->name('stats');
        
        Route::get('/alerts', function () {
            // Critical alerts: low stock, expiring batches, large variances
            return response()->json([
                'message' => 'Dashboard alerts endpoint - to be implemented in DashboardController'
            ]);
        })->name('alerts');
    });
    
    // Search across inventory entities
    Route::get('/search', function () {
        // Global search across products, batches, etc.
        return response()->json([
            'message' => 'Global inventory search endpoint - to be implemented'
        ]);
    })->name('search');
    
    // Export functionality
    Route::prefix('exports')->name('exports.')->group(function () {
        Route::get('/products', function () {
            // Export products to Excel/CSV
            return response()->json([
                'message' => 'Product export endpoint - to be implemented'
            ]);
        })->name('products');
        
        Route::get('/stock-transactions', function () {
            // Export transactions to Excel/CSV
            return response()->json([
                'message' => 'Stock transaction export endpoint - to be implemented'
            ]);
        })->name('stock-transactions');
        
        Route::get('/physical-counts', function () {
            // Export counts to Excel/CSV
            return response()->json([
                'message' => 'Physical count export endpoint - to be implemented'
            ]);
        })->name('physical-counts');
    });
});