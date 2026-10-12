<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/dashboard';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(function () {
                    // Load module-specific routes
                    $this->loadModuleRoutes();
                });

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Load routes for each module.
     */
    protected function loadModuleRoutes(): void
    {
        $modules = [
            'UserManagement',
            'Inventory',
            'Procurement',
            'Reporting',
        ];

        foreach ($modules as $module) {
            $routePath = app_path("Modules/{$module}/Routes/api.php");
            if (file_exists($routePath)) {
                Route::group([], $routePath);
            }
        }
    }
}