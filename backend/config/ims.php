<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Inventory Management System Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration values specific to the IMS application business logic
    | and operational requirements.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Variance Detection
    |--------------------------------------------------------------------------
    |
    | Configuration for physical count variance detection and alerting.
    | When shrinkage exceeds the threshold, alerts are triggered.
    |
    */
    'variance' => [
        'default_threshold_percent' => env('IMS_DEFAULT_VARIANCE_THRESHOLD', 5),
        'alert_enabled' => env('IMS_VARIANCE_ALERTS_ENABLED', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Batch Expiry Management
    |--------------------------------------------------------------------------
    |
    | Configuration for batch expiry tracking and FEFO enforcement.
    | Warning period determines when batches enter "warning" state.
    |
    */
    'expiry' => [
        'warning_days' => env('IMS_EXPIRY_WARNING_DAYS', 60),
        'fefo_enforcement' => env('IMS_FEFO_ENFORCEMENT', true),
        'auto_expire_batches' => env('IMS_AUTO_EXPIRE_BATCHES', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pagination Settings
    |--------------------------------------------------------------------------
    |
    | Default pagination settings for API endpoints.
    |
    */
    'pagination' => [
        'default_per_page' => env('IMS_DEFAULT_PAGINATION_SIZE', 15),
        'max_per_page' => env('IMS_MAX_PAGINATION_SIZE', 100),
    ],

    /*
    |--------------------------------------------------------------------------
    | Reorder Point Calculation
    |--------------------------------------------------------------------------
    |
    | Configuration for automated reorder point calculations and
    | demand forecasting parameters.
    |
    */
    'reorder' => [
        'default_lead_time_days' => env('IMS_DEFAULT_LEAD_TIME_DAYS', 7),
        'safety_stock_multiplier' => env('IMS_SAFETY_STOCK_MULTIPLIER', 1.5),
        'seasonal_analysis_months' => env('IMS_SEASONAL_ANALYSIS_MONTHS', 12),
        'min_history_days' => env('IMS_MIN_HISTORY_DAYS', 90),
    ],

    /*
    |--------------------------------------------------------------------------
    | Stock Transaction Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for stock movement tracking and validation.
    |
    */
    'stock' => [
        'require_batch_tracking' => env('IMS_REQUIRE_BATCH_TRACKING', true),
        'allow_negative_stock' => env('IMS_ALLOW_NEGATIVE_STOCK', false),
        'audit_all_transactions' => env('IMS_AUDIT_ALL_TRANSACTIONS', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Roles and Permissions
    |--------------------------------------------------------------------------
    |
    | Configuration for the three-tier role system.
    |
    */
    'roles' => [
        'warehouse' => [
            'name' => 'Warehouse Staff',
            'permissions' => [
                'view_products',
                'create_physical_counts',
                'create_discrepancy_reports',
                'view_fefo_recommendations',
                'receive_stock',
            ],
        ],
        'inventory' => [
            'name' => 'Inventory Staff',
            'permissions' => [
                'manage_products',
                'manage_stock_transactions',
                'manage_reservations',
                'manage_batches',
                'create_damage_reports',
                'view_reports',
            ],
        ],
        'manager' => [
            'name' => 'Manager',
            'permissions' => [
                'manage_users',
                'manage_suppliers',
                'approve_purchase_orders',
                'view_all_reports',
                'configure_reorder_points',
                'override_business_rules',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Business Rules
    |--------------------------------------------------------------------------
    |
    | Core business logic configuration that affects system behavior.
    |
    */
    'business_rules' => [
        'enforce_fefo' => env('IMS_ENFORCE_FEFO', true),
        'require_po_approval' => env('IMS_REQUIRE_PO_APPROVAL', true),
        'auto_generate_procurement_requests' => env('IMS_AUTO_GENERATE_PROCUREMENT_REQUESTS', true),
        'lock_expired_batches' => env('IMS_LOCK_EXPIRED_BATCHES', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | API Configuration
    |--------------------------------------------------------------------------
    |
    | API-specific settings for the IMS endpoints.
    |
    */
    'api' => [
        'version' => '1.0.0',
        'rate_limit_per_minute' => env('IMS_API_RATE_LIMIT', 60),
        'enable_cors' => env('IMS_API_ENABLE_CORS', true),
        'cors_origins' => env('IMS_API_CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173'),
    ],
];