<?php

namespace App\Core\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use App\Core\Services\StatusCodeService;
use Throwable;
use Illuminate\Support\Facades\Log;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e): mixed
    {
        // Only handle API requests with JSON responses
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->handleApiException($request, $e);
        }

        return parent::render($request, $e);
    }

    /**
     * Handle API exceptions with standardized response format.
     */
    protected function handleApiException(Request $request, Throwable $exception): JsonResponse
    {
        $statusCodeService = app(StatusCodeService::class);

        // Log the exception for monitoring
        $this->logException($exception, $request);

        // Handle custom API exceptions
        if ($exception instanceof ApiException) {
            return $statusCodeService->errorResponse(
                $exception->getMessage(),
                $exception->getStatusCode(),
                $exception->getErrorCode(),
                $exception->getContext()
            );
        }

        // Handle Laravel validation exceptions
        if ($exception instanceof ValidationException) {
            return $statusCodeService->unprocessableEntity(
                'The given data was invalid.',
                $exception->errors()
            );
        }

        // Handle authentication exceptions
        if ($exception instanceof AuthenticationException) {
            return $statusCodeService->unauthorized('Unauthenticated.');
        }

        // Handle authorization exceptions
        if ($exception instanceof AuthorizationException) {
            return $statusCodeService->forbidden('This action is unauthorized.');
        }

        // Handle model not found exceptions
        if ($exception instanceof ModelNotFoundException) {
            return $statusCodeService->notFound(
                'Resource not found.',
                $this->getResourceNameFromModel($exception)
            );
        }

        // Handle method not allowed exceptions
        if ($exception instanceof MethodNotAllowedHttpException) {
            return $statusCodeService->methodNotAllowed();
        }

        // Handle not found exceptions
        if ($exception instanceof NotFoundHttpException) {
            return $statusCodeService->notFound('Endpoint not found.');
        }

        // Handle database connection errors
        if ($this->isDatabaseException($exception)) {
            return $statusCodeService->serviceUnavailable(
                'Database temporarily unavailable. Please try again later.',
                'database'
            );
        }

        // Handle timeout exceptions
        if ($this->isTimeoutException($exception)) {
            return $statusCodeService->gatewayTimeout(
                'Request timed out. Please try again.',
                30
            );
        }

        // Default server error for unhandled exceptions
        $requestId = $request->header('X-Request-ID') ?? uniqid();
        
        return $statusCodeService->internalServerError(
            'An unexpected error occurred. Please contact support if the problem persists.',
            $requestId
        );
    }

    /**
     * Log exception details for monitoring and debugging.
     */
    protected function logException(Throwable $exception, Request $request): void
    {
        $context = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
            'user_id' => auth()->id(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];

        // Log at different levels based on exception type
        if ($exception instanceof ApiException) {
            // Custom API exceptions are expected business logic issues
            Log::info('API Exception', $context);
        } elseif ($this->isClientError($exception)) {
            // Client errors (4xx) are logged as info
            Log::info('Client Error', $context);
        } else {
            // Server errors (5xx) are logged as errors with full trace
            $context['trace'] = $exception->getTraceAsString();
            Log::error('Server Error', $context);
        }
    }

    /**
     * Extract resource name from ModelNotFoundException.
     */
    protected function getResourceNameFromModel(ModelNotFoundException $exception): ?string
    {
        if (method_exists($exception, 'getModel')) {
            $model = $exception->getModel();
            return class_basename($model);
        }

        return null;
    }

    /**
     * Check if exception is a database-related error.
     */
    protected function isDatabaseException(Throwable $exception): bool
    {
        return $exception instanceof \PDOException ||
               $exception instanceof \Illuminate\Database\QueryException ||
               str_contains(strtolower($exception->getMessage()), 'database') ||
               str_contains(strtolower($exception->getMessage()), 'connection');
    }

    /**
     * Check if exception is a timeout-related error.
     */
    protected function isTimeoutException(Throwable $exception): bool
    {
        return str_contains(strtolower($exception->getMessage()), 'timeout') ||
               str_contains(strtolower($exception->getMessage()), 'time out') ||
               $exception instanceof \Symfony\Component\HttpKernel\Exception\HttpException && 
               $exception->getStatusCode() === 504;
    }

    /**
     * Check if exception represents a client error.
     */
    protected function isClientError(Throwable $exception): bool
    {
        return $exception instanceof ValidationException ||
               $exception instanceof AuthenticationException ||
               $exception instanceof AuthorizationException ||
               $exception instanceof ModelNotFoundException ||
               $exception instanceof NotFoundHttpException ||
               $exception instanceof MethodNotAllowedHttpException;
    }
}