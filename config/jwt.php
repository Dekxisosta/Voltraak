<?php

return [
    /*
    |--------------------------------------------------------------------------
    | JWT Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for JSON Web Token authentication
    |
    */

    'secret' => env('JWT_SECRET', env('APP_KEY')),
    
    'algorithm' => env('JWT_ALGO', 'HS256'),
    
    'expiration' => env('JWT_EXPIRATION', 3600), // 1 hour in seconds
    
    'refresh_expiration' => env('JWT_REFRESH_EXPIRATION', 86400), // 24 hours in seconds
    
    'issuer' => env('JWT_ISSUER', env('APP_URL')),
    
    'audience' => env('JWT_AUDIENCE', env('APP_URL')),
];