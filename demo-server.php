<?php
/**
 * Voltraak IMS - Quick Demo Server
 * Simple PHP demo to showcase API structure
 */

// Enable CORS for local development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Parse the request
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/demo-server.php', '', $path);

// Demo data
$demoUsers = [
    [
        'id' => 1,
        'name' => 'System Administrator',
        'email' => 'admin@voltraak.com',
        'role' => 'manager',
        'role_display' => 'Manager',
        'is_active' => true,
        'last_login_at' => '2024-01-15T10:30:00Z'
    ],
    [
        'id' => 2,
        'name' => 'Store Manager',
        'email' => 'manager@voltraak.com',
        'role' => 'manager',
        'role_display' => 'Manager',
        'is_active' => true,
        'last_login_at' => '2024-01-14T15:45:00Z'
    ]
];

$demoProducts = [
    [
        'id' => 1,
        'name' => 'Samsung Refrigerator 21cu',
        'sku' => 'SAMSUNG-RF21',
        'category' => 'Appliances',
        'unit_price' => 25990.00,
        'current_stock' => 15,
        'available_stock' => 12,
        'reserved_stock' => 3,
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
        'reserved_stock' => 0,
        'reorder_point' => 5,
        'stock_status' => 'low_stock',
        'is_seasonal' => false
    ]
];

$demoBatches = [
    [
        'id' => 1,
        'product_id' => 1,
        'batch_number' => 'BATCH-2024-001',
        'quantity' => 15,
        'available_quantity' => 12,
        'manufacture_date' => '2024-01-10',
        'expiry_date' => '2025-01-10',
        'status' => 'safe',
        'days_to_expiry' => 350
    ]
];

// Response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode([
        'success' => $status < 400,
        'data' => $data,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
    exit();
}

function errorResponse($message, $status = 400, $errors = null) {
    http_response_code($status);
    $response = [
        'success' => false,
        'message' => $message,
        'timestamp' => date('c')
    ];
    if ($errors) {
        $response['errors'] = $errors;
    }
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit();
}

// Router
switch ($path) {
    case '/api/health':
        jsonResponse([
            'status' => 'healthy',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'services' => [
                'api' => 'running',
                'database' => 'demo_mode',
                'cache' => 'demo_mode'
            ]
        ]);
        break;

    case '/api/auth/login':
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        // Demo authentication
        $validCredentials = [
            'admin@voltraak.com' => 'admin123',
            'manager@voltraak.com' => 'manager123',
            'inventory@voltraak.com' => 'inventory123',
            'warehouse@voltraak.com' => 'warehouse123'
        ];
        
        if (!isset($validCredentials[$email]) || $validCredentials[$email] !== $password) {
            errorResponse('Invalid credentials', 401);
        }
        
        $user = array_values(array_filter($demoUsers, function($u) use ($email) {
            return $u['email'] === $email;
        }))[0] ?? $demoUsers[0];
        
        jsonResponse([
            'user' => $user,
            'token' => 'demo_jwt_token_' . base64_encode($email),
            'api_token' => 'demo_api_token_' . uniqid(),
            'expires_in' => 3600
        ]);
        break;

    case '/api/auth/me':
        if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
            errorResponse('Unauthenticated', 401);
        }
        jsonResponse($demoUsers[0]);
        break;

    case '/api/inventory/products':
        if ($method === 'GET') {
            jsonResponse([
                'products' => $demoProducts,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 15,
                    'total' => count($demoProducts)
                ]
            ]);
        } elseif ($method === 'POST') {
            jsonResponse([
                'product' => array_merge($demoProducts[0], ['id' => 999, 'name' => 'New Product'])
            ], 201);
        }
        break;

    case '/api/inventory/batches':
        jsonResponse([
            'batches' => $demoBatches
        ]);
        break;

    case '/api/reports/dashboard/kpi':
        jsonResponse([
            'inventory_metrics' => [
                'total_skus' => ['current' => 150, 'previous' => 147, 'change_percent' => 2.04],
                'stock_accuracy' => ['current' => 97.2, 'previous' => 94.8, 'change_percent' => 2.53],
                'shrinkage_rate' => ['current' => 2.1, 'previous' => 5.7, 'change_percent' => -63.16]
            ],
            'financial_metrics' => [
                'inventory_value' => ['current' => 2875430.00, 'previous' => 2650000.00, 'change_percent' => 8.51],
                'inventory_turnover' => ['current' => 8.2, 'previous' => 6.8, 'change_percent' => 20.59]
            ],
            'operational_metrics' => [
                'stockout_incidents' => ['current' => 3, 'previous' => 8, 'change_percent' => -62.5],
                'expiry_writeoffs' => ['current' => 1250.00, 'previous' => 15000.00, 'change_percent' => -91.67]
            ]
        ]);
        break;

    default:
        errorResponse('Endpoint not found', 404);
}
?>