# API Exception Hierarchy

This directory contains the standardized exception hierarchy for the Inventory Management System API. These exceptions provide consistent error handling and HTTP status code mapping across all API endpoints.

## Overview

The exception hierarchy is designed to standardize HTTP status codes and error responses throughout the application, ensuring consistent client-side error handling and improved debugging capabilities.

## Exception Classes

### ApiException (Abstract Base Class)

The `ApiException` abstract base class provides the foundation for all API-related exceptions:

```php
abstract class ApiException extends Exception
{
    abstract public function getStatusCode(): int;
    abstract public function getErrorCode(): string;
    public function getContext(): array;
}
```

**Key Features:**
- Forces all API exceptions to implement status code mapping
- Provides consistent interface for error code retrieval
- Supports additional context information for error responses

### Client Error Exceptions (4xx Status Codes)

#### ValidationException
- **Status Code:** 422 Unprocessable Entity
- **Error Code:** `VALIDATION_FAILED`
- **Use Cases:** Form validation failures, invalid data types, missing required fields
- **Context:** Includes field-specific validation errors

```php
$exception = new ValidationException([
    'name' => ['The name field is required.'],
    'quantity' => ['The quantity must be positive.']
]);
```

#### ResourceNotFoundException  
- **Status Code:** 404 Not Found
- **Error Code:** `RESOURCE_NOT_FOUND`
- **Use Cases:** Database records not found, non-existent API resources
- **Context:** Includes resource type and identifier

```php
$exception = new ResourceNotFoundException('Product', 123);
```

#### ConflictException
- **Status Code:** 409 Conflict  
- **Error Code:** `RESOURCE_CONFLICT`
- **Use Cases:** Business logic conflicts, insufficient inventory, FEFO violations, invalid resource states
- **Context:** Conflict-specific details

```php
// Static factory methods available:
ConflictException::insufficientInventory($available, $requested, $product);
ConflictException::fefoViolation($batchId, $earlierBatch);  
ConflictException::reservationConflict($resourceId, $existingReservation);
ConflictException::invalidResourceState($resource, $currentState, $requiredState);
```

### Server Error Exceptions (5xx Status Codes)

#### ServiceUnavailableException
- **Status Code:** 503 Service Unavailable
- **Error Code:** `SERVICE_UNAVAILABLE`  
- **Use Cases:** Database connection failures, external service timeouts, maintenance mode
- **Context:** Service name and failure details

```php
// Static factory methods available:
ServiceUnavailableException::databaseUnavailable($database, $reason);
ServiceUnavailableException::externalServiceUnavailable($serviceName, $endpoint, $reason);
ServiceUnavailableException::maintenanceMode($message, $estimatedCompletion);
```

## Usage Guidelines

### In Controllers

Controllers should catch business logic exceptions and let the global exception handler map them to appropriate HTTP responses:

```php
class ProductController extends BaseController
{
    public function show($id)
    {
        $product = Product::find($id);
        
        if (!$product) {
            throw new ResourceNotFoundException('Product', $id);
        }
        
        return $this->success($product);
    }
    
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'quantity' => 'required|integer|min:0'
        ]);
        
        if ($validator->fails()) {
            throw new ValidationException($validator->errors()->toArray());
        }
        
        // Business logic...
    }
}
```

### In Services

Business services should throw appropriate exceptions when business rules are violated:

```php
class InventoryService
{
    public function adjustStock($productId, $quantity)
    {
        $product = Product::find($productId);
        
        if (!$product) {
            throw new ResourceNotFoundException('Product', $productId);
        }
        
        if ($product->quantity < abs($quantity)) {
            throw ConflictException::insufficientInventory(
                $product->quantity, 
                abs($quantity), 
                $product->name
            );
        }
        
        // Perform stock adjustment...
    }
}
```

## Error Response Format

All exceptions are automatically converted to standardized JSON error responses by the global exception handler:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The given data was invalid.",
    "context": {
      "errors": {
        "name": ["The name field is required."],
        "quantity": ["The quantity must be positive."]
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing

The exception hierarchy includes comprehensive unit tests to verify:
- Correct status code mapping
- Proper error code generation  
- Context information handling
- Static factory method functionality
- Inheritance relationships

Run tests with:
```bash
php test_exceptions.php
```

## Requirements Validation

This exception hierarchy satisfies the following requirements from the HTTP status codes standardization specification:

- **Requirement 2.1:** Authentication error status codes (401/403)
- **Requirement 3.1:** Client error status codes (400/404/409/422)  
- **Requirement 4.1:** Server error status codes (500/503/504)
- **Requirement 5.1-5.4:** Consistent error response formatting
- **Requirements 8.1-8.5:** Business logic error handling
- **Requirements 10.3-10.5:** Testable status code specifications

## Integration

The exception hierarchy integrates with:
- **Global Exception Handler:** Maps exceptions to HTTP responses
- **StatusCodeService:** Formats consistent error responses  
- **BaseController:** Provides exception throwing helpers
- **API Documentation:** Generates status code documentation
- **Frontend:** Enables proper client-side error handling