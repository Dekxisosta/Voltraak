<?php

namespace App\Core\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use App\Core\Services\StatusCodeService;

/**
 * BaseController
 * 
 * Base controller class that all module controllers should extend.
 * Provides standardized response methods using StatusCodeService and
 * common functionality for API endpoints.
 */
abstract class BaseController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    protected StatusCodeService $statusCodeService;

    /**
     * Create a new controller instance.
     */
    public function __construct(StatusCodeService $statusCodeService)
    {
        $this->statusCodeService = $statusCodeService;
    }

    /**
     * Return a successful response.
     */
    protected function success($data, int $statusCode = 200): JsonResponse
    {
        return $this->statusCodeService->successResponse($data, $statusCode);
    }

    /**
     * Return a 200 OK response.
     */
    protected function ok($data): JsonResponse
    {
        return $this->statusCodeService->ok($data);
    }

    /**
     * Return a 201 Created response.
     */
    protected function created($data): JsonResponse
    {
        return $this->statusCodeService->created($data);
    }

    /**
     * Return a 204 No Content response.
     */
    protected function noContent(): JsonResponse
    {
        return $this->statusCodeService->noContent();
    }

    /**
     * Return a 400 Bad Request response.
     */
    protected function badRequest(string $message = 'Bad request', array $context = []): JsonResponse
    {
        return $this->statusCodeService->badRequest($message, $context);
    }

    /**
     * Return a 401 Unauthorized response.
     */
    protected function unauthorized(string $message = 'Unauthenticated'): JsonResponse
    {
        return $this->statusCodeService->unauthorized($message);
    }

    /**
     * Return a 403 Forbidden response.
     */
    protected function forbidden(string $message = 'This action is unauthorized'): JsonResponse
    {
        return $this->statusCodeService->forbidden($message);
    }

    /**
     * Return a 404 Not Found response.
     */
    protected function notFound(string $message = 'Resource not found', ?string $resource = null): JsonResponse
    {
        return $this->statusCodeService->notFound($message, $resource);
    }

    /**
     * Return a 409 Conflict response.
     */
    protected function conflict(string $message, array $context = []): JsonResponse
    {
        return $this->statusCodeService->conflict($message, $context);
    }

    /**
     * Return a 422 Unprocessable Entity response.
     */
    protected function unprocessableEntity(string $message = 'The given data was invalid', array $errors = []): JsonResponse
    {
        return $this->statusCodeService->unprocessableEntity($message, $errors);
    }

    /**
     * Return a 500 Internal Server Error response.
     */
    protected function internalServerError(string $message = 'An unexpected error occurred', ?string $requestId = null): JsonResponse
    {
        return $this->statusCodeService->internalServerError($message, $requestId);
    }

    /**
     * Return a 503 Service Unavailable response.
     */
    protected function serviceUnavailable(string $message = 'Service temporarily unavailable', ?string $service = null): JsonResponse
    {
        return $this->statusCodeService->serviceUnavailable($message, $service);
    }

    /**
     * Handle paginated response.
     */
    protected function paginated($paginatedData): JsonResponse
    {
        return $this->ok([
            'data' => $paginatedData->items(),
            'pagination' => [
                'current_page' => $paginatedData->currentPage(),
                'per_page' => $paginatedData->perPage(),
                'total' => $paginatedData->total(),
                'last_page' => $paginatedData->lastPage(),
                'has_more_pages' => $paginatedData->hasMorePages(),
            ]
        ]);
    }

    /**
     * Get pagination parameters from request.
     */
    protected function getPaginationParams(): array
    {
        return [
            'page' => request()->get('page', 1),
            'per_page' => min(request()->get('per_page', 15), 100) // Max 100 items per page
        ];
    }
}