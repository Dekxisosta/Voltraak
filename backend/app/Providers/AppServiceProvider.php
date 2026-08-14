<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Core\Services\StatusCodeService;
use App\Core\Auth\JwtService;
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
        $this->app->singleton(JwtService::class);
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
        
        // Set default pagination
        \Illuminate\Pagination\Paginator::defaultView('pagination::bootstrap-4');
        \Illuminate\Pagination\Paginator::defaultSimpleView('pagination::simple-bootstrap-4');
    }
}