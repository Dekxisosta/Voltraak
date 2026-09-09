<?php

namespace App\Core\Services;

use Illuminate\Http\JsonResponse;

/**
 * StatusCodeService
 * 
 * Centralized service for managing HTTP status codes and formatting API responses.
 * Provides consistent response formatting, status code validation, and standardized
 * success/error response structures across all API endpoints.
 * 
 * Requirements: 1.1 (Success Response Status Codes), 5.1 (Status Code Documentation Format), 
 * 5.2 (Status Code Documentation Format)
 */
class StatusCodeService
{
    /**
     * List of allowed HTTP status codes for the Inventory Management System API.
     * 
     * @var array
     */
    private const ALLOWED_STATUS_CODES = [
        // Success codes (2xx)
        200, // OK - GET, PATCH, POST (non-creation)
        201, // Created - POST (resource creation) 
        204, // No Content - DELETE
        
        // Client error codes (4xx)
        400, // Bad Request - malformed request
        401, // Unauthorized - missing/invalid authentication
        403, // Forbidden - insufficient permissions
        404, // Not Found - resource not found
        405, // Method Not Allowed - unsupported HTTP method
        409, // Conflict - business logic conflicts
        413, // Payload Too Large - request size exceeds limits
        422, // Unprocessable Entity - validation failures
        
        // Server error codes (5xx)
        500, // Internal Server Error - unexpected errors
        503, // Service Unavailable - database/service down
        504, // Gateway Timeout - request timeout
    ];

    /**
     * Create a standardized success response.
     * 
     * @param  mixed  $data Response data
     * @param  int  $statusCode HTTP status code (default: 200)
     * @return \Illuminate\Http\JsonResponse
     */
    public function successResponse($data, int $statusCode = 200): JsonResponse
    {
        $this->validateStatusCode($statusCode);
        
        return response()->json([
            'success' => true,
            'data' => $data,
            'timestamp' => now()->toISOString()
        ], $statusCode);
    }

    /**
     * Create a standardized error response.
     * 
     * @param  string  $message Error message
     * @param  int  $statusCode HTTP status code
     * @param  string  $errorCode Application error code
     * @param  array  $context Additional error context
     * @return \Illuminate\Http\JsonResponse
     */
    public function errorResponse(
        string $message, 
        int $statusCode, 
        string $errorCode,
        array $context = []
    ): JsonResponse {
        $this->validateStatusCode($statusCode);

        return response()->json([
            'success' => false,
            'error' => [
                'code' => $errorCode,
                'message' => $message,
                'context' => $context
            ],
            'timestamp' => now()->toISOString()
        ], $statusCode);
    }

    /**
     * Validate that the given status code is allowed.
     * 
     * @param  int  $statusCode HTTP status code to validate
     * @return bool True if valid
     * @throws \InvalidArgumentException If status code is not allowed
     */
    public function validateStatusCode(int $statusCode): bool
    {
        if (!in_array($statusCode, $this->getAllowedStatusCodes())) {
            throw new \InvalidArgumentException(
                "Status code {$statusCode} is not allowed. Allowed codes: " . 
                implode(', ', $this->getAllowedStatusCodes())
            );
        }

        return true;
    }

    /**
     * Get the list of allowed HTTP status codes.
     * 
     * @return array List of allowed status codes
     */
    public function getAllowedStatusCodes(): array
    {
        return self::ALLOWED_STATUS_CODES;
    }

    /**
     * Create a 200 OK response with data.
     * 
     * @param  mixed  $data Response data
     * @return \Illuminate\Http\JsonResponse
     */
    public function ok($data): JsonResponse
    {
        return $this->successResponse($data, 200);
    }

    /**
     * Create a 201 Created response for resource creation.
     * 
     * @param  mixed  $data Created resource data
     * @return \Illuminate\Http\JsonResponse
     */
    public function created($data): JsonResponse
    {
        return $this->successResponse($data, 201);
    }

    /**
     * Create a 204 No Content response for successful deletion.
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    /**
     * Create a 400 Bad Request error response.
     * 
     * @param  string  $message Error message
     * @param  array  $context Additional error context
     * @return \Illuminate\Http\JsonResponse
     */
    public function badRequest(string $message = 'Bad request', array $context = []): JsonResponse
    {
        return $this->errorResponse($message, 400, 'BAD_REQUEST', $context);
    }

    /**
     * Create a 401 Unauthorized error response.
     * 
     * @param  string  $message Error message
     * @return \Illuminate\Http\JsonResponse
     */
    public function unauthorized(string $message = 'Unauthenticated'): JsonResponse
    {
        return $this->errorResponse($message, 401, 'UNAUTHENTICATED');
    }

    /**
     * Create a 403 Forbidden error response.
     * 
     * @param  string  $message Error message
     * @return \Illuminate\Http\JsonResponse
     */
    public function forbidden(string $message = 'This action is unauthorized'): JsonResponse
    {
        return $this->errorResponse($message, 403, 'UNAUTHORIZED');
    }

    /**
     * Create a 404 Not Found error response.
     * 
     * @param  string  $message Error message
     * @param  string|null  $resource Resource type that was not found
     * @return \Illuminate\Http\JsonResponse
     */
    public function notFound(string $message = 'Resource not found', ?string $resource = null): JsonResponse
    {
        $context = $resource ? ['resource' => $resource] : [];
        return $this->errorResponse($message, 404, 'RESOURCE_NOT_FOUND', $context);
    }

    /**
     * Create a 405 Method Not Allowed error response.
     * 
     * @param  array  $allowedMethods List of allowed HTTP methods
     * @return \Illuminate\Http\JsonResponse
     */
    public function methodNotAllowed(array $allowedMethods = []): JsonResponse
    {
        $context = $allowedMethods ? ['allowed_methods' => $allowedMethods] : [];
        return $this->errorResponse(
            'The specified HTTP method is not allowed for this endpoint', 
            405, 
            'METHOD_NOT_ALLOWED', 
            $context
        );
    }

    /**
     * Create a 409 Conflict error response.
     * 
     * @param  string  $message Error message
     * @param  array  $context Additional conflict context
     * @return \Illuminate\Http\JsonResponse
     */
    public function conflict(string $message, array $context = []): JsonResponse
    {
        return $this->errorResponse($message, 409, 'RESOURCE_CONFLICT', $context);
    }

    /**
     * Create a 413 Payload Too Large error response.
     * 
     * @param  string  $message Error message
     * @param  int|null  $maxSize Maximum allowed payload size in bytes
     * @return \Illuminate\Http\JsonResponse
     */
    public function payloadTooLarge(string $message = 'Request payload exceeds size limits', ?int $maxSize = null): JsonResponse
    {
        $context = $maxSize ? ['max_size_bytes' => $maxSize] : [];
        return $this->errorResponse($message, 413, 'PAYLOAD_TOO_LARGE', $context);
    }

    /**
     * Create a 422 Unprocessable Entity error response for validation failures.
     * 
     * @param  string  $message Error message
     * @param  array  $errors Field validation errors
     * @return \Illuminate\Http\JsonResponse
     */
    public function unprocessableEntity(string $message = 'The given data was invalid', array $errors = []): JsonResponse
    {
        $context = $errors ? ['errors' => $errors] : [];
        return $this->errorResponse($message, 422, 'VALIDATION_FAILED', $context);
    }

    /**
     * Create a 500 Internal Server Error response.
     * 
     * @param  string  $message Error message (should be generic for security)
     * @param  string|null  $requestId Request ID for tracking
     * @return \Illuminate\Http\JsonResponse
     */
    public function internalServerError(string $message = 'An unexpected error occurred', ?string $requestId = null): JsonResponse
    {
        $context = $requestId ? ['request_id' => $requestId] : [];
        return $this->errorResponse($message, 500, 'INTERNAL_SERVER_ERROR', $context);
    }

    /**
     * Create a 503 Service Unavailable error response.
     * 
     * @param  string  $message Error message
     * @param  string|null  $service Service name that is unavailable
     * @param  string|null  $retryAfter Suggested retry time
     * @return \Illuminate\Http\JsonResponse
     */
    public function serviceUnavailable(string $message = 'Service temporarily unavailable', ?string $service = null, ?string $retryAfter = null): JsonResponse
    {
        $context = array_filter([
            'service' => $service,
            'retry_after' => $retryAfter
        ]);
        
        $response = $this->errorResponse($message, 503, 'SERVICE_UNAVAILABLE', $context);
        
        if ($retryAfter) {
            $response->header('Retry-After', $retryAfter);
        }
        
        return $response;
    }

    /**
     * Create a 504 Gateway Timeout error response.
     * 
     * @param  string  $message Error message
     * @param  int|null  $timeoutSeconds Timeout duration in seconds
     * @return \Illuminate\Http\JsonResponse
     */
    public function gatewayTimeout(string $message = 'Request timeout', ?int $timeoutSeconds = null): JsonResponse
    {
        $context = $timeoutSeconds ? ['timeout_seconds' => $timeoutSeconds] : [];
        return $this->errorResponse($message, 504, 'GATEWAY_TIMEOUT', $context);
    }

    /**
     * Check if a status code represents success (2xx range).
     * 
     * @param  int  $statusCode HTTP status code
     * @return bool True if status code is in success range
     */
    public function isSuccess(int $statusCode): bool
    {
        return $statusCode >= 200 && $statusCode < 300;
    }

    /**
     * Check if a status code represents a client error (4xx range).
     * 
     * @param  int  $statusCode HTTP status code
     * @return bool True if status code is in client error range
     */
    public function isClientError(int $statusCode): bool
    {
        return $statusCode >= 400 && $statusCode < 500;
    }

    /**
     * Check if a status code represents a server error (5xx range).
     * 
     * @param  int  $statusCode HTTP status code
     * @return bool True if status code is in server error range
     */
    public function isServerError(int $statusCode): bool
    {
        return $statusCode >= 500 && $statusCode < 600;
    }

    /**
     * Get the category name for a status code.
     * 
     * @param  int  $statusCode HTTP status code
     * @return string Category name (Success, Client Error, Server Error, etc.)
     */
    public function getStatusCategory(int $statusCode): string
    {
        return match (true) {
            $statusCode >= 200 && $statusCode < 300 => 'Success',
            $statusCode >= 300 && $statusCode < 400 => 'Redirection',
            $statusCode >= 400 && $statusCode < 500 => 'Client Error',
            $statusCode >= 500 && $statusCode < 600 => 'Server Error',
            default => 'Unknown'
        };
    }
}