<?php

namespace App\Core\Exceptions;

/**
 * Exception thrown when a request conflicts with the current state of the resource.
 * 
 * This exception is thrown for business logic conflicts such as:
 * - Stock operations exceeding available inventory
 * - Operations on resources in invalid states (e.g., already processed orders)
 * - Reservation conflicts with existing reservations
 * - FEFO (First Expired, First Out) violations
 * - Duplicate resource creation attempts
 * 
 * HTTP Status Code: 409 Conflict
 * Error Code: RESOURCE_CONFLICT
 */
class ConflictException extends ApiException
{
    /**
     * Additional context about the conflict.
     * 
     * @var array
     */
    protected array $conflictContext;

    /**
     * Create a new conflict exception.
     * 
     * @param string $message Exception message describing the conflict
     * @param array $context Additional context about the conflict
     */
    public function __construct(string $message = 'Resource conflict occurred', array $context = [])
    {
        parent::__construct($message);
        $this->conflictContext = $context;
    }

    /**
     * Get the HTTP status code for conflict errors.
     * 
     * @return int HTTP status code 409
     */
    public function getStatusCode(): int
    {
        return 409;
    }

    /**
     * Get the error code for resource conflicts.
     * 
     * @return string Error code 'RESOURCE_CONFLICT'
     */
    public function getErrorCode(): string
    {
        return 'RESOURCE_CONFLICT';
    }

    /**
     * Get the conflict context information.
     * 
     * @return array Context information about the conflict
     */
    public function getContext(): array
    {
        return $this->conflictContext;
    }

    /**
     * Create a conflict exception for insufficient inventory.
     * 
     * @param int $available Available inventory quantity
     * @param int $requested Requested quantity
     * @param string|null $product Product identifier
     * @return static
     */
    public static function insufficientInventory(int $available, int $requested, ?string $product = null): static
    {
        $message = $product 
            ? "Insufficient inventory for product '{$product}'. Available: {$available}, Requested: {$requested}"
            : "Insufficient inventory. Available: {$available}, Requested: {$requested}";

        return new static($message, [
            'type' => 'insufficient_inventory',
            'available' => $available,
            'requested' => $requested,
            'product' => $product
        ]);
    }

    /**
     * Create a conflict exception for FEFO violations.
     * 
     * @param string $batchId The batch ID that would violate FEFO rules
     * @param string $earlierBatch The batch that should be used first
     * @return static
     */
    public static function fefoViolation(string $batchId, string $earlierBatch): static
    {
        return new static(
            "FEFO violation: Cannot use batch '{$batchId}' before earlier expiring batch '{$earlierBatch}'",
            [
                'type' => 'fefo_violation',
                'attempted_batch' => $batchId,
                'earlier_batch' => $earlierBatch
            ]
        );
    }

    /**
     * Create a conflict exception for reservation conflicts.
     * 
     * @param string $resourceId The resource that has conflicting reservations
     * @param string|null $existingReservation ID of the existing reservation
     * @return static
     */
    public static function reservationConflict(string $resourceId, ?string $existingReservation = null): static
    {
        $message = $existingReservation
            ? "Resource '{$resourceId}' is already reserved by reservation '{$existingReservation}'"
            : "Resource '{$resourceId}' has conflicting reservations";

        return new static($message, [
            'type' => 'reservation_conflict',
            'resource_id' => $resourceId,
            'existing_reservation' => $existingReservation
        ]);
    }

    /**
     * Create a conflict exception for invalid resource state.
     * 
     * @param string $resource The resource identifier
     * @param string $currentState Current state of the resource
     * @param string $requiredState Required state for the operation
     * @return static
     */
    public static function invalidResourceState(string $resource, string $currentState, string $requiredState): static
    {
        return new static(
            "Resource '{$resource}' is in '{$currentState}' state, but '{$requiredState}' state is required",
            [
                'type' => 'invalid_state',
                'resource' => $resource,
                'current_state' => $currentState,
                'required_state' => $requiredState
            ]
        );
    }
}