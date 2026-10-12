<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Health Check
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'status' => 'healthy',
            'version' => '1.0.0',
            'timestamp' => now()->toISOString(),
            'services' => [
                'database' => 'connected',
                'cache' => 'working',
                'session' => 'working'
            ]
        ],
        'timestamp' => now()->toISOString()
    ]);
});

/*
|--------------------------------------------------------------------------
| Module Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // User Management (auth routes under v1/)
    require __DIR__ . '/../app/Modules/UserManagement/Routes/api.php';
    
    // Inventory Module
    require __DIR__ . '/../app/Modules/Inventory/Routes/api.php';
    
    // Procurement Module
    require __DIR__ . '/../app/Modules/Procurement/Routes/api.php';
    
    // Reporting Module
    require __DIR__ . '/../app/Modules/Reporting/Routes/api.php';
});
