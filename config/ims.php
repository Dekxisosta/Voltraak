<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Inventory Management System Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the IMS system
    |
    */

    'expiry' => [
        'warning_days' => env('IMS_EXPIRY_WARNING_DAYS', 60),
    ],

    'reorder' => [
        'min_history_days' => env('IMS_REORDER_MIN_HISTORY_DAYS', 30),
        'default_service_level' => env('IMS_DEFAULT_SERVICE_LEVEL', 95),
    ],

    'alerts' => [
        'low_stock_threshold' => env('IMS_LOW_STOCK_THRESHOLD', 'reorder_point'),
        'stockout_threshold' => env('IMS_STOCKOUT_THRESHOLD', 0),
    ],
];