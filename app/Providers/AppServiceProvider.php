<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Core\Services\StatusCodeService;
use App\Core\Permissions\PermissionService;
use App\Core\Logging\ActivityLogger;
use App\Core\Notifications\NotificationService;
use App\Core\Shared\ValidationService;
use App\Modules\Procurement\Services\ProcurementService;
use App\Modules\Procurement\Services\ReorderPointCalculator;
use App\Modules\Reporting\Services\AnalyticsService;
use App\Modules\Reporting\Services\DashboardService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register Core services as singletons
        $this->app->singleton(StatusCodeService::class);
        $this->app->singleton(PermissionService::class);
        $this->app->singleton(ActivityLogger::class);
        $this->app->singleton(NotificationService::class);
        $this->app->singleton(ValidationService::class);
        
        // Register Procurement services
        $this->app->singleton(ProcurementService::class);
        $this->app->singleton(ReorderPointCalculator::class);
        
        // Register Reporting services
        $this->app->singleton(AnalyticsService::class);
        $this->app->singleton(DashboardService::class);
        
        // Register User Management services
        $this->app->singleton(\App\Modules\UserManagement\Services\AuthService::class);
        $this->app->singleton(\App\Modules\UserManagement\Services\UserService::class);
        $this->app->singleton(\App\Modules\UserManagement\Repositories\UserRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set default string length for MySQL
        Schema::defaultStringLength(191);
        
        // Login throttle: 5 attempts/minute per email+IP pair, plus a looser
        // per-IP ceiling so one address can't spray many accounts.
        RateLimiter::for('login', function (Request $request) {
            $tooMany = function (Request $request, array $headers) {
                $message = 'Too many login attempts. Please try again in a minute.';

                if ($request->expectsJson()) {
                    return response()->json(['message' => $message], 429, $headers);
                }

                return back()->withErrors(['email' => $message]);
            };

            $email = strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by($email . '|' . $request->ip())->response($tooMany),
                Limit::perMinute(20)->by($request->ip())->response($tooMany),
            ];
        });

        // Set default pagination
        \Illuminate\Pagination\Paginator::defaultView('pagination::bootstrap-4');
        \Illuminate\Pagination\Paginator::defaultSimpleView('pagination::simple-bootstrap-4');
    }
}