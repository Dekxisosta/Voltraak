<?php

namespace Tests\Unit\Core\Exceptions;

use PHPUnit\Framework\TestCase;
use App\Core\Exceptions\ApiException;
use App\Core\Exceptions\ValidationException;
use App\Core\Exceptions\ResourceNotFoundException;
use App\Core\Exceptions\ConflictException;
use App\Core\Exceptions\ServiceUnavailableException;

/**
 * Test suite for the API exception hierarchy.
 * 
 * This test suite verifies that all exception classes properly implement
 * the required status code mapping and error code functionality as specified
 * in the HTTP status codes standardization requirements.
 */
class ExceptionHierarchyTest extends TestCase
{
    /**
     * Test that ValidationException returns correct status code and error code.
     */
    public function test_validation_exception_returns_422_status_code(): void
    {
        $errors = [
            'name' => ['The name field is required.'],
            'quantity' => ['The quantity must be a positive integer.']
        ];
        
        $exception = new ValidationException($errors, 'Validation failed');

        $this->assertEquals(422, $exception->getStatusCode());
        $this->assertEquals('VALIDATION_FAILED', $exception->getErrorCode());
        $this->assertEquals('Validation failed', $exception->getMessage());
        $this->assertEquals(['errors' => $errors], $exception->getContext());
        $this->assertEquals($errors, $exception->getErrors());
    }

    /**
     * Test that ValidationException can be created with default message.
     */
    public function test_validation_exception_with_default_message(): void
    {
        $exception = new ValidationException();

        $this->assertEquals(422, $exception->getStatusCode());
        $this->assertEquals('VALIDATION_FAILED', $exception->getErrorCode());
        $this->assertEquals('The given data was invalid.', $exception->getMessage());
        $this->assertEquals(['errors' => []], $exception->getContext());
    }

    /**
     * Test that ResourceNotFoundException returns correct status code and error code.
     */
    public function test_resource_not_found_exception_returns_404_status_code(): void
    {
        $exception = new ResourceNotFoundException('Product', 123);

        $this->assertEquals(404, $exception->getStatusCode());
        $this->assertEquals('RESOURCE_NOT_FOUND', $exception->getErrorCode());
        $this->assertEquals("Product with ID '123' not found", $exception->getMessage());
        $this->assertEquals([
            'resource_type' => 'Product',
            'resource_id' => 123
        ], $exception->getContext());
        $this->assertEquals('Product', $exception->getResourceType());
        $this->assertEquals(123, $exception->getResourceId());
    }

    /**
     * Test ResourceNotFoundException with different parameter combinations.
     */
    public function test_resource_not_found_exception_variations(): void
    {
        // Test with resource type only
        $exception1 = new ResourceNotFoundException('User');
        $this->assertEquals("User not found", $exception1->getMessage());
        $this->assertEquals(['resource_type' => 'User'], $exception1->getContext());

        // Test with no parameters
        $exception2 = new ResourceNotFoundException();
        $this->assertEquals("Resource not found", $exception2->getMessage());
        $this->assertEquals([], $exception2->getContext());

        // Test with custom message
        $exception3 = new ResourceNotFoundException('Product', 999, 'Custom not found message');
        $this->assertEquals('Custom not found message', $exception3->getMessage());
    }

    /**
     * Test that ConflictException returns correct status code and error code.
     */
    public function test_conflict_exception_returns_409_status_code(): void
    {
        $context = [
            'available' => 5,
            'requested' => 10
        ];
        
        $exception = new ConflictException('Insufficient inventory', $context);

        $this->assertEquals(409, $exception->getStatusCode());
        $this->assertEquals('RESOURCE_CONFLICT', $exception->getErrorCode());
        $this->assertEquals('Insufficient inventory', $exception->getMessage());
        $this->assertEquals($context, $exception->getContext());
    }

    /**
     * Test ConflictException static factory methods.
     */
    public function test_conflict_exception_static_factories(): void
    {
        // Test insufficient inventory factory
        $exception1 = ConflictException::insufficientInventory(5, 10, 'Widget A');
        $this->assertEquals(409, $exception1->getStatusCode());
        $this->assertStringContains('Widget A', $exception1->getMessage());
        $this->assertEquals([
            'type' => 'insufficient_inventory',
            'available' => 5,
            'requested' => 10,
            'product' => 'Widget A'
        ], $exception1->getContext());

        // Test FEFO violation factory
        $exception2 = ConflictException::fefoViolation('batch-123', 'batch-456');
        $this->assertEquals(409, $exception2->getStatusCode());
        $this->assertStringContains('FEFO violation', $exception2->getMessage());
        $this->assertEquals([
            'type' => 'fefo_violation',
            'attempted_batch' => 'batch-123',
            'earlier_batch' => 'batch-456'
        ], $exception2->getContext());

        // Test reservation conflict factory
        $exception3 = ConflictException::reservationConflict('resource-123', 'reservation-456');
        $this->assertEquals(409, $exception3->getStatusCode());
        $this->assertStringContains('already reserved', $exception3->getMessage());
        $this->assertEquals([
            'type' => 'reservation_conflict',
            'resource_id' => 'resource-123',
            'existing_reservation' => 'reservation-456'
        ], $exception3->getContext());

        // Test invalid state factory
        $exception4 = ConflictException::invalidResourceState('order-123', 'approved', 'pending');
        $this->assertEquals(409, $exception4->getStatusCode());
        $this->assertStringContains('approved', $exception4->getMessage());
        $this->assertEquals([
            'type' => 'invalid_state',
            'resource' => 'order-123',
            'current_state' => 'approved',
            'required_state' => 'pending'
        ], $exception4->getContext());
    }

    /**
     * Test that ServiceUnavailableException returns correct status code and error code.
     */
    public function test_service_unavailable_exception_returns_503_status_code(): void
    {
        $context = ['reason' => 'Connection timeout'];
        $exception = new ServiceUnavailableException('database', 'Database connection failed', $context);

        $this->assertEquals(503, $exception->getStatusCode());
        $this->assertEquals('SERVICE_UNAVAILABLE', $exception->getErrorCode());
        $this->assertEquals('Database connection failed', $exception->getMessage());
        $this->assertEquals(['service' => 'database', 'reason' => 'Connection timeout'], $exception->getContext());
        $this->assertEquals('database', $exception->getService());
    }

    /**
     * Test ServiceUnavailableException static factory methods.
     */
    public function test_service_unavailable_exception_static_factories(): void
    {
        // Test database unavailable factory
        $exception1 = ServiceUnavailableException::databaseUnavailable('mysql', 'Connection pool exhausted');
        $this->assertEquals(503, $exception1->getStatusCode());
        $this->assertStringContains('mysql', $exception1->getMessage());
        $this->assertEquals([
            'service' => 'database',
            'database' => 'mysql',
            'reason' => 'Connection pool exhausted'
        ], $exception1->getContext());

        // Test external service unavailable factory
        $exception2 = ServiceUnavailableException::externalServiceUnavailable('payment-api', '/api/v1/payments', 'Gateway timeout');
        $this->assertEquals(503, $exception2->getStatusCode());
        $this->assertStringContains('payment-api', $exception2->getMessage());
        $this->assertEquals([
            'service' => 'payment-api',
            'endpoint' => '/api/v1/payments',
            'reason' => 'Gateway timeout',
            'type' => 'external_service'
        ], $exception2->getContext());

        // Test maintenance mode factory
        $exception3 = ServiceUnavailableException::maintenanceMode('Scheduled maintenance', '2024-01-15 14:00:00');
        $this->assertEquals(503, $exception3->getStatusCode());
        $this->assertStringContains('maintenance', $exception3->getMessage());
        $this->assertEquals([
            'service' => 'system',
            'type' => 'maintenance',
            'estimated_completion' => '2024-01-15 14:00:00'
        ], $exception3->getContext());
    }

    /**
     * Test that all exceptions extend ApiException.
     */
    public function test_all_exceptions_extend_api_exception(): void
    {
        $exceptions = [
            new ValidationException(),
            new ResourceNotFoundException(),
            new ConflictException(),
            new ServiceUnavailableException()
        ];

        foreach ($exceptions as $exception) {
            $this->assertInstanceOf(ApiException::class, $exception);
        }
    }

    /**
     * Test that each exception has unique status codes and error codes.
     */
    public function test_exceptions_have_unique_status_and_error_codes(): void
    {
        $exceptions = [
            ValidationException::class => [422, 'VALIDATION_FAILED'],
            ResourceNotFoundException::class => [404, 'RESOURCE_NOT_FOUND'],
            ConflictException::class => [409, 'RESOURCE_CONFLICT'],
            ServiceUnavailableException::class => [503, 'SERVICE_UNAVAILABLE']
        ];

        foreach ($exceptions as $exceptionClass => $expected) {
            $exception = new $exceptionClass();
            [$expectedStatusCode, $expectedErrorCode] = $expected;

            $this->assertEquals($expectedStatusCode, $exception->getStatusCode(), 
                "{$exceptionClass} should return status code {$expectedStatusCode}");
            $this->assertEquals($expectedErrorCode, $exception->getErrorCode(),
                "{$exceptionClass} should return error code {$expectedErrorCode}");
        }
    }

    /**
     * Test that ApiException implements required abstract methods.
     */
    public function test_api_exception_abstract_methods_implementation(): void
    {
        $validationException = new ValidationException();

        // Ensure getStatusCode returns integer
        $this->assertIsInt($validationException->getStatusCode());
        
        // Ensure getErrorCode returns string
        $this->assertIsString($validationException->getErrorCode());
        
        // Ensure getContext returns array
        $this->assertIsArray($validationException->getContext());
    }
}