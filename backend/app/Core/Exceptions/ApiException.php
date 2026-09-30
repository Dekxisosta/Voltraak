<?php

namespace App\Core\Exceptions;

use Exception;

/**
 * Abstract base class for API exceptions with status code mapping.
 * 
 * This class provides the foundation for all API-related exceptions in the Inventory 
 * Management System, ensuring consistent error handling and HTTP status code mapping.
 * 
 * All API exceptions must extend this class to ensure proper status code handling
 * and consistent error response formatting.
 */
abstract class ApiException extends Exception
{
    /**
     * Get the HTTP status code for this exception.
     * 
     * @return int HTTP status code (e.g., 400, 404, 422, 500)
     */
    abstract public function getStatusCode(): int;

    /**
     * Get the application-specific error code for this exception.
     * 
     * @return string Error code constant (e.g., 'VALIDATION_FAILED', 'RESOURCE_NOT_FOUND')
     */
    abstract public function getErrorCode(): string;

    /**
     * Get additional context information for this exception.
     * 
     * This method can be overridden by concrete exception classes to provide
     * specific context data that will be included in the error response.
     * 
     * @return array Additional context data
     */
    public function getContext(): array
    {
        return [];
    }
}