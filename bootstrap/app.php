<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Core\Exceptions\Handler;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // End sessions of deactivated users, and drop sessions whose password
        // hash no longer matches (password change / reset on another device).
        $middleware->web(append: [
            \Illuminate\Session\Middleware\AuthenticateSession::class,
            \App\Http\Middleware\EnsureUserIsActive::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->api(append: [
            \App\Http\Middleware\EnsureUserIsActive::class,
        ]);

        $middleware->alias([
            'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
            'status-code' => \App\Core\Middleware\StatusCodeMiddleware::class,
            'role' => \App\Core\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

// Laravel 11's Exceptions config object doesn't expose a `handler()` method
// (that API is from Laravel 8-10). Bind the custom handler into the
// container directly instead.
$app->singleton(\Illuminate\Contracts\Debug\ExceptionHandler::class, Handler::class);

return $app;
