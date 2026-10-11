<?php

namespace App\Core\Exceptions;

/**
 * Exception thrown when request data fails validation rules.
 * 
 * This exception is thrown when:
 * - Required fields are missing
 * - Data types are invalid  
 * - Business rule validation fails
 * - Request payload format is incorrect
 * 
 * HTTP Status Code: 422 Unprocessable Entity
 * Error Code: VALIDATION_FAILED
 */
class ValidationException extends ApiException
{
    /**
     * Validation errors grouped by field.
     * 
     * @var array
     */
    protected array $errors;

    /**
     * Create a new validation exception.
     * 
     * @param array $errors Validation errors grouped by field name
     * @param string $message Exception message
     */
    public function __construct(array $errors = [], string $message = 'The given data was invalid.')
    {
        parent::__construct($message);
        $this->errors = $errors;
    }

    /**
     * Get the HTTP status code for validation errors.
     * 
     * @return int HTTP status code 422
     */
    public function getStatusCode(): int
    {
        return 422;
    }

    /**
     * Get the error code for validation failures.
     * 
     * @return string Error code 'VALIDATION_FAILED'
     */
    public function getErrorCode(): string
    {
        return 'VALIDATION_FAILED';
    }

    /**
     * Get the validation errors as context.
     * 
     * @return array Validation errors grouped by field
     */
    public function getContext(): array
    {
        return [
            'errors' => $this->errors
        ];
    }

    /**
     * Get the validation errors.
     * 
     * @return array Validation errors
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}