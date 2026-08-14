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

// Simple test endpoints for demo
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Voltraak IMS API is working!',
        'timestamp' => now()->toISOString()
    ]);
});

// Demo authentication endpoint (simplified for testing)
Route::post('/auth/login', function (Illuminate\Http\Request $request) {
    $credentials = [
        'admin@voltraak.com' => 'admin123',
        'manager@voltraak.com' => 'manager123',
        'inventory@voltraak.com' => 'inventory123',
        'warehouse@voltraak.com' => 'warehouse123'
    ];
    
    $email = $request->input('email');
    $password = $request->input('password');
    
    if (isset($credentials[$email]) && $credentials[$email] === $password) {
        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => 1,
                    'name' => 'Demo User',
                    'email' => $email,
                    'role' => 'manager'
                ],
                'token' => 'demo_token_' . base64_encode($email),
                'api_token' => 'demo_api_' . uniqid(),
                'expires_in' => 3600
            ],
            'timestamp' => now()->toISOString()
        ]);
    }
    
    return response()->json([
        'success' => false,
        'message' => 'Invalid credentials',
        'timestamp' => now()->toISOString()
    ], 401);
});

// Demo products endpoint
Route::get('/inventory/products', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'products' => [
                [
                    'id' => 1,
                    'name' => 'Samsung Refrigerator 21cu',
                    'sku' => 'SAMSUNG-RF21',
                    'category' => 'Appliances',
                    'unit_price' => 25990.00,
                    'current_stock' => 15,
                    'available_stock' => 12,
                    'reorder_point' => 5,
                    'stock_status' => 'in_stock',
                    'is_seasonal' => false
                ],
                [
                    'id' => 2,
                    'name' => 'LG Washing Machine 8kg',
                    'sku' => 'LG-WM8',
                    'category' => 'Appliances',
                    'unit_price' => 18990.00,
                    'current_stock' => 3,
                    'available_stock' => 3,
                    'reorder_point' => 5,
                    'stock_status' => 'low_stock',
                    'is_seasonal' => false
                ]
            ],
            'pagination' => [
                'current_page' => 1,
                'total' => 2,
                'per_page' => 15
            ]
        ],
        'timestamp' => now()->toISOString()
    ]);
});

// Demo KPI dashboard
Route::get('/reports/dashboard/kpi', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'inventory_metrics' => [
                'total_skus' => ['current' => 150, 'previous' => 147, 'change_percent' => 2.04],
                'stock_accuracy' => ['current' => 97.2, 'previous' => 94.8, 'change_percent' => 2.53],
                'shrinkage_rate' => ['current' => 2.1, 'previous' => 5.7, 'change_percent' => -63.16]
            ],
            'financial_metrics' => [
                'inventory_value' => ['current' => 2875430.00, 'previous' => 2650000.00, 'change_percent' => 8.51],
                'inventory_turnover' => ['current' => 8.2, 'previous' => 6.8, 'change_percent' => 20.59]
            ]
        ],
        'timestamp' => now()->toISOString()
    ]);
});

/*
|--------------------------------------------------------------------------
| Module Routes (Full Implementation)
|--------------------------------------------------------------------------
| Uncomment when ready to use full module implementation
|
*/

// User Management Module (no prefix for auth routes)
// require __DIR__ . '/../app/Modules/UserManagement/Routes/api.php';

// Inventory Module Routes
// require __DIR__ . '/../app/Modules/Inventory/Routes/api.php';

// Reporting Module Routes
// require __DIR__ . '/../app/Modules/Reporting/Routes/api.php';