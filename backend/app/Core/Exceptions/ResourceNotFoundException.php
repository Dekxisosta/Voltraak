<?php

namespace App\Core\Exceptions;

/**
 * Exception thrown when a requested resource cannot be found.
 * 
 * This exception is thrown when:
 * - A requested database record does not exist
 * - An API endpoint targets a non-existent resource
 * - A file or asset cannot be located
 * 
 * HTTP Status Code: 404 Not Found
 * Error Code: RESOURCE_NOT_FOUND
 */
class ResourceNotFoundException extends ApiException
{
    /**
     * The type of resource that was not found.
     * 
     * @var string|null
     */
    protected ?string $resourceType;

    /**
     * The identifier used to search for the resource.
     * 
     * @var mixed
     */
    protected mixed $resourceId;

    /**
     * Create a new resource not found exception.
     * 
     * @param string|null $resourceType The type of resource (e.g., 'Product', 'User', 'Batch')
     * @param mixed $resourceId The ID or identifier that was not found
     * @param string|null $message Custom exception message
     */
    public function __construct(?string $resourceType = null, mixed $resourceId = null, ?string $message = null)
    {
        $this->resourceType = $resourceType;
        $this->resourceId = $resourceId;

        if ($message === null) {
            $message = $resourceType 
                ? ($resourceId !== null 
                    ? "{$resourceType} with ID '{$resourceId}' not found" 
                    : "{$resourceType} not found")
                : 'Resource not found';
        }

        parent::__construct($message);
    }

    /**
     * Get the HTTP status code for not found errors.
     * 
     * @return int HTTP status code 404
     */
    public function getStatusCode(): int
    {
        return 404;
    }

    /**
     * Get the error code for resource not found.
     * 
     * @return string Error code 'RESOURCE_NOT_FOUND'
     */
    public function getErrorCode(): string
    {
        return 'RESOURCE_NOT_FOUND';
    }

    /**
     * Get the resource information as context.
     * 
     * @return array Resource type and ID information
     */
    public function getContext(): array
    {
        return array_filter([
            'resource_type' => $this->resourceType,
            'resource_id' => $this->resourceId
        ]);
    }

    /**
     * Get the resource type.
     * 
     * @return string|null Resource type
     */
    public function getResourceType(): ?string
    {
        return $this->resourceType;
    }

    /**
     * Get the resource ID.
     * 
     * @return mixed Resource identifier
     */
    public function getResourceId(): mixed
    {
        return $this->resourceId;
    }
}