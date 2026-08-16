<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Reporting\Controllers\DashboardController;
use App\Modules\Reporting\Controllers\ReportController;

/*
|--------------------------------------------------------------------------
| Reporting API Routes
|--------------------------------------------------------------------------
|
| Here are the API routes for the Reporting module.
| All routes are prefixed with 'api/reporting' and require authentication.
|
*/

Route::middleware(['auth:sanctum'])->prefix('reporting')->name('reporting.')->group(function () {
    
    /*
    |--------------------------------------------------------------------------
    | Dashboard Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('dashboard')->name('dashboard.')->group(function () {
        // Role-based dashboards
        Route::get('/executive', [DashboardController::class, 'executive'])->name('executive');
        Route::get('/manager', [DashboardController::class, 'manager'])->name('manager');
        Route::get('/staff', [DashboardController::class, 'staff'])->name('staff');
        
        // Dashboard components
        Route::get('/kpis', [DashboardController::class, 'kpis'])->name('kpis');
        Route::get('/trends', [DashboardController::class, 'inventoryTrends'])->name('trends');
        Route::get('/alerts', [DashboardController::class, 'alerts'])->name('alerts');
        Route::get('/accuracy', [DashboardController::class, 'accuracy'])->name('accuracy');
        Route::get('/performance', [DashboardController::class, 'performance'])->name('performance');
        Route::get('/abc-analysis', [DashboardController::class, 'abcAnalysis'])->name('abc-analysis');
        
        // Dashboard export
        Route::post('/export', [DashboardController::class, 'export'])->name('export');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Report Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('reports')->name('reports.')->group(function () {
        // Inventory reports
        Route::get('/inventory-summary', [ReportController::class, 'inventorySummary'])->name('inventory-summary');
        Route::get('/stock-movement', [ReportController::class, 'stockMovement'])->name('stock-movement');
        Route::get('/accuracy', [ReportController::class, 'accuracy'])->name('accuracy');
        Route::get('/expiry', [ReportController::class, 'expiry'])->name('expiry');
        
        // Procurement reports
        Route::get('/procurement', [ReportController::class, 'procurement'])->name('procurement');
        
        // Analytics reports
        Route::get('/abc-analysis', [ReportController::class, 'abcAnalysis'])->name('abc-analysis');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Export Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('exports')->name('exports.')->group(function () {
        Route::get('/inventory', function () {
            // Export inventory reports to Excel/CSV
            return response()->json([
                'message' => 'Inventory export endpoint - to be implemented'
            ]);
        })->name('inventory');
        
        Route::get('/procurement', function () {
            // Export procurement reports to Excel/CSV
            return response()->json([
                'message' => 'Procurement export endpoint - to be implemented'
            ]);
        })->name('procurement');
        
        Route::get('/analytics', function () {
            // Export analytics reports to Excel/CSV
            return response()->json([
                'message' => 'Analytics export endpoint - to be implemented'
            ]);
        })->name('analytics');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Real-time Data Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('realtime')->name('realtime.')->group(function () {
        Route::get('/metrics', function () {
            // Real-time metrics endpoint for dashboard updates
            return response()->json([
                'message' => 'Real-time metrics endpoint - to be implemented'
            ]);
        })->name('metrics');
        
        Route::get('/alerts', function () {
            // Real-time alerts endpoint
            return response()->json([
                'message' => 'Real-time alerts endpoint - to be implemented'
            ]);
        })->name('alerts');
    });
});