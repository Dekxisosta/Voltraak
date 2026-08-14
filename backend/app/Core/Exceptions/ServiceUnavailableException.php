<?php

namespace App\Core\Exceptions;

/**
 * Exception thrown when a service or dependency is temporarily unavailable.
 * 
 * This exception is thrown when:
 * - Database connection failures occur
 * - External service dependencies are unavailable
 * - System resources are temporarily exhausted
 * - Scheduled maintenance is in progress
 * 
 * HTTP Status Code: 503 Service Unavailable
 * Error Code: SERVICE_UNAVAILABLE
 */
class ServiceUnavailableException extends ApiException
{
    /**
     * The service that is unavailable.
     * 
     * @var string|null
     */
    protected ?string $service;

    /**
     * Additional context about the service unavailability.
     * 
     * @var array
     */
    protected array $serviceContext;

    /**
     * Create a new service unavailable exception.
     * 
     * @param string|null $service The service that is unavailable
     * @param string|null $message Custom exception message
     * @param array $context Additional context about the service failure
     */
    public function __construct(?string $service = null, ?string $message = null, array $context = [])
    {
        $this->service = $service;
        $this->serviceContext = $context;

        if ($message === null) {
            $message = $service 
                ? "Service '{$service}' is temporarily unavailable" 
                : 'Service temporarily unavailable';
        }

        parent::__construct($message);
    }

    /**
     * Get the HTTP status code for service unavailable errors.
     * 
     * @return int HTTP status code 503
     */
    public function getStatusCode(): int
    {
        return 503;
    }

    /**
     * Get the error code for service unavailable.
     * 
     * @return string Error code 'SERVICE_UNAVAILABLE'
     */
    public function getErrorCode(): string
    {
        return 'SERVICE_UNAVAILABLE';
    }

    /**
     * Get the service unavailability context.
     * 
     * @return array Service and context information
     */
    public function getContext(): array
    {
        return array_merge(
            array_filter(['service' => $this->service]),
            $this->serviceContext
        );
    }

    /**
     * Get the unavailable service name.
     * 
     * @return string|null Service name
     */
    public function getService(): ?string
    {
        return $this->service;
    }

    /**
     * Create a database unavailable exception.
     * 
     * @param string|null $database Database name or connection
     * @param string|null $reason Reason for unavailability
     * @return static
     */
    public static function databaseUnavailable(?string $database = null, ?string $reason = null): static
    {
        $message = $database
            ? "Database '{$database}' is temporarily unavailable"
            : 'Database is temporarily unavailable';

        return new static('database', $message, array_filter([
            'database' => $database,
            'reason' => $reason
        ]));
    }

    /**
     * Create an external service unavailable exception.
     * 
     * @param string $serviceName Name of the external service
     * @param string|null $endpoint Service endpoint that failed
     * @param string|null $reason Reason for failure
     * @return static
     */
    public static function externalServiceUnavailable(string $serviceName, ?string $endpoint = null, ?string $reason = null): static
    {
        $message = "External service '{$serviceName}' is temporarily unavailable";

        return new static($serviceName, $message, array_filter([
            'endpoint' => $endpoint,
            'reason' => $reason,
            'type' => 'external_service'
        ]));
    }

    /**
     * Create a maintenance mode exception.
     * 
     * @param string|null $maintenanceMessage Custom maintenance message
     * @param string|null $estimatedCompletion Estimated completion time
     * @return static
     */
    public static function maintenanceMode(?string $maintenanceMessage = null, ?string $estimatedCompletion = null): static
    {
        $message = $maintenanceMessage ?? 'System is temporarily under maintenance';

        return new static('system', $message, array_filter([
            'type' => 'maintenance',
            'estimated_completion' => $estimatedCompletion
        ]));
    }
}