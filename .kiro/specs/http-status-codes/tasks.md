# Implementation Plan: HTTP Status Codes Standardization

## Overview

This implementation plan converts the HTTP status codes standardization design into actionable coding tasks. The plan covers both the backend Laravel implementation for standardizing API responses across 55 endpoints and the frontend React integration for proper error handling and user experience.

The implementation follows a structured approach: foundation infrastructure, module-by-module backend updates, frontend integration, and comprehensive testing to ensure all requirements are met while maintaining backward compatibility.

## Tasks

- [ ] 1. Create backend foundation infrastructure
  - [x] 1.1 Create exception hierarchy and base ApiException class
    - Implement `ApiException` abstract base class with status code mapping
    - Create client error exceptions: `ValidationException`, `ResourceNotFoundException`, `ConflictException`  
    - Create server error exceptions: `ServiceUnavailableException`
    - _Requirements: 2.1, 3.1, 4.1_

  - [ ]* 1.2 Write property test for exception hierarchy
    - **Property 1: Authentication Required Endpoints Return 401 for Missing Credentials**
    - **Validates: Requirements 10.3**

  - [ ] 1.3 Implement StatusCodeService for centralized response handling
    - Create `StatusCodeService` class with `successResponse()` and `errorResponse()` methods
    - Implement status code validation with `getAllowedStatusCodes()`
    - Add consistent JSON response formatting with success/error structure
    - _Requirements: 1.1, 5.1, 5.2_

  - [ ]* 1.4 Write unit tests for StatusCodeService
    - Test success response formatting with proper status codes
    - Test error response formatting with error codes and context
    - Test status code validation methods
    - _Requirements: 5.3, 5.4_

- [ ] 2. Enhance global exception handling
  - [ ] 2.1 Update global Exception Handler class
    - Extend Laravel's `ExceptionHandler` to map business exceptions to HTTP status codes
    - Handle `ApiException`, `ValidationException`, `AuthenticationException` cases
    - Map `ModelNotFoundException` to 404 and authorization errors to 403
    - Implement default 500 handling for unhandled exceptions
    - _Requirements: 2.1, 2.2, 3.1, 4.1_

  - [ ]* 2.2 Write property test for role-restricted endpoints
    - **Property 2: Role-Restricted Endpoints Return 403 for Unauthorized Access**
    - **Validates: Requirements 10.4**

  - [ ] 2.3 Create BaseController with standardized response methods
    - Implement `BaseController` with success/error response helpers
    - Add methods for `success()`, `created()`, `noContent()`, `badRequest()`, `notFound()`, `conflict()`
    - Integrate with `StatusCodeService` for consistent responses
    - _Requirements: 1.2, 1.3, 3.2, 3.4_

  - [ ]* 2.4 Write unit tests for BaseController response methods
    - Test each response method returns correct status codes
    - Test response format consistency
    - _Requirements: 1.4, 1.5_

- [ ] 3. Create status code middleware and documentation
  - [ ] 3.1 Implement StatusCodeMiddleware for logging
    - Create middleware to log API responses with status codes
    - Include endpoint, method, status code, user ID, and timestamp
    - Integrate with Laravel's logging system
    - _Requirements: 4.1, 10.1_

  - [ ] 3.2 Update API documentation schema structure
    - Define OpenAPI schema extensions for status code documentation
    - Create standardized error response schema format
    - Define success response schema format with timestamps
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Checkpoint - Verify foundation components
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update User Management Module endpoints
  - [ ] 5.1 Update AuthController with standardized status codes
    - Update login endpoint to return 401 for invalid credentials
    - Update logout endpoint with appropriate success responses
    - Map authentication exceptions to proper status codes
    - _Requirements: 2.1, 2.2, 6.1, 7.1_

  - [ ] 5.2 Update UserController with CRUD status codes
    - Update user creation to return 201 for success, 422 for validation errors
    - Update user retrieval to return 404 for not found users
    - Update user updates to return 200 for success, 403 for unauthorized access
    - Update user deletion to return 204 for success
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 6.1_

  - [ ]* 5.3 Write property test for request body validation
    - **Property 3: Request Body Endpoints Return 422 for Invalid Data**  
    - **Validates: Requirements 10.5**

  - [ ]* 5.4 Write unit tests for User Management status codes
    - Test role-based access returns 403 for unauthorized users
    - Test validation failures return 422 with proper error details
    - Test resource not found returns 404 responses
    - _Requirements: 7.2, 7.3, 8.4_

- [ ] 6. Update Inventory Module endpoints (Phase 1: Core Product Operations)
  - [ ] 6.1 Update ProductController with standardized responses
    - Update GET /products to return 200 for success, 200 with empty results for pagination beyond data
    - Update POST /products to return 201 for creation, 409 for conflicts, 422 for validation
    - Update PATCH /products/{id} to return 200 for updates, 404 for not found
    - Update DELETE /products/{id} to return 204 for deletion
    - _Requirements: 1.1, 1.2, 3.1, 3.4, 6.2, 9.1_

  - [ ] 6.2 Update BatchController with business logic status codes
    - Update batch operations to return 422 for expired batch operations
    - Update batch queries to return 404 for non-existent batches
    - Implement FEFO violation handling with 409 status codes
    - _Requirements: 8.2, 8.4, 8.5_

  - [ ]* 6.3 Write unit tests for Inventory Module core operations
    - Test stock operations exceed available inventory returns 409
    - Test expired batch operations return 422 
    - Test FEFO violations return 409 with context
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 7. Update Inventory Module endpoints (Phase 2: Stock and Reservation Operations)
  - [ ] 7.1 Update StockTransactionController with conflict handling
    - Update stock-out operations to return 409 for insufficient inventory
    - Update stock-in operations with proper success responses
    - Implement business rule validation with appropriate status codes
    - _Requirements: 8.1, 8.5, 6.2_

  - [ ] 7.2 Update ReservationController with conflict detection
    - Update reservation creation to return 409 for conflicts with existing reservations
    - Update reservation operations to return 422 for expired reservations  
    - Implement role-based access with 403 responses
    - _Requirements: 8.2, 8.4, 7.1, 7.3_

  - [ ]* 7.3 Write unit tests for Stock and Reservation operations
    - Test reservation conflicts return 409 status codes
    - Test operations on expired reservations return 422
    - Test insufficient inventory operations return 409
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 8. Update Procurement Module endpoints
  - [ ] 8.1 Update SupplierController with standardized responses
    - Update supplier CRUD operations with proper status codes
    - Implement validation error handling with 422 responses
    - Add role-based access control with 403 responses
    - _Requirements: 1.1, 1.2, 3.2, 6.3, 7.2_

  - [ ] 8.2 Update PurchaseOrderController with approval workflow status codes
    - Update PO creation to return 201 for success, 422 for validation errors
    - Update PO approval to return 409 for already approved orders
    - Implement Manager-only operations with 403 for unauthorized roles
    - Update PO state transitions with proper conflict handling
    - _Requirements: 8.3, 7.1, 7.2, 6.3_

  - [ ]* 8.3 Write unit tests for Procurement Module operations
    - Test purchase order approval on already approved orders returns 409
    - Test Manager-only operations return 403 for non-Manager roles
    - Test supplier relationship conflicts return 409
    - _Requirements: 8.3, 7.1, 7.2_

- [ ] 9. Update Reporting Module endpoints
  - [ ] 9.1 Update ReportController and DashboardController
    - Update dashboard endpoints with proper success responses
    - Update report generation with appropriate error handling for failures
    - Implement role-based access for sensitive reports with 403 responses
    - Add query parameter validation with 422 responses
    - _Requirements: 1.1, 6.4, 7.1, 9.4_

  - [ ]* 9.2 Write unit tests for Reporting Module
    - Test report generation failures return appropriate server errors
    - Test invalid query parameters return 422
    - Test unauthorized report access returns 403
    - _Requirements: 4.2, 9.4, 7.3_

- [ ] 10. Update cross-cutting endpoints  
  - [ ] 10.1 Update remaining endpoints with standardized status codes
    - Update health check and system status endpoints
    - Ensure method not allowed scenarios return 405
    - Implement payload size limit handling with 413 responses  
    - _Requirements: 3.3, 3.5, 6.5_

- [ ] 11. Checkpoint - Verify all backend endpoints updated
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Create frontend error handling infrastructure  
  - [ ] 12.1 Create API error classes for frontend
    - Implement `ApiError` base class and specific error types in JavaScript
    - Create `ValidationError`, `AuthenticationError`, `AuthorizationError` classes
    - Create `NotFoundError`, `ConflictError`, `ServerError` classes  
    - _Requirements: 2.1, 2.2, 3.1, 4.1_

  - [ ] 12.2 Enhance existing API client with status code handling
    - Update `api/client.js` to handle all standardized status codes
    - Implement automatic token clearing and redirect on 401 errors
    - Add comprehensive error mapping and response handling
    - _Requirements: 2.1, 2.2, 3.1, 4.1_

  - [ ]* 12.3 Write unit tests for frontend API client
    - Test error mapping for all status code scenarios
    - Test authentication error handling and token clearing
    - Test response format parsing and error instantiation
    - _Requirements: 2.1, 2.2, 3.1, 4.1_

- [ ] 13. Create React error handling components
  - [ ] 13.1 Create useApiError hook for centralized error state
    - Implement hook with error state, loading state, and error handlers
    - Add clear error and handle error methods
    - Integrate with existing component patterns
    - _Requirements: 5.1, 5.2_

  - [ ] 13.2 Create ErrorAlert component for standardized error display
    - Implement error display with appropriate icons and colors by status code
    - Add dismiss functionality and error details expansion
    - Create responsive design with Tailwind CSS classes
    - _Requirements: 5.3, 5.4_

  - [ ] 13.3 Create ValidationErrors component for form error display
    - Implement validation error display for 422 responses
    - Show field-specific errors in user-friendly format
    - Integrate with existing form styling patterns
    - _Requirements: 3.2, 5.4_

  - [ ]* 13.4 Write unit tests for React error components
    - Test ErrorAlert component with different error types
    - Test ValidationErrors component with validation error data
    - Test user interaction handlers and dismiss functionality
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 14. Update existing React components with enhanced error handling
  - [ ] 14.1 Update product list and form components
    - Integrate `useApiError` hook in ProductList and ProductForm components
    - Add proper error display and validation error handling
    - Update loading states and success response handling
    - _Requirements: 3.1, 3.2, 8.1, 9.1_

  - [ ] 14.2 Update authentication and user management components
    - Enhance existing `useAuth` hook with standardized error handling
    - Update login form with validation error display
    - Improve authentication error messaging
    - _Requirements: 2.1, 2.2, 7.1, 7.2_

  - [ ] 14.3 Update procurement and reporting components  
    - Add error handling to purchase order and supplier components
    - Update report components with appropriate error states
    - Implement role-based error messaging for unauthorized access
    - _Requirements: 7.1, 7.2, 8.3, 9.4_

- [ ] 15. Implement comprehensive API documentation updates
  - [ ] 15.1 Generate OpenAPI documentation for all endpoints
    - Update all 55 endpoint definitions with comprehensive status codes
    - Include response schemas for success and error scenarios
    - Group status codes by category with descriptions
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [ ] 15.2 Create example response payloads
    - Add example JSON responses for each status code scenario  
    - Include context data for business logic errors
    - Document error code constants and their meanings
    - _Requirements: 5.4, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 15.3 Write documentation verification tests
    - Test API documentation completeness for all endpoints
    - Verify response schemas match implementation
    - Test example payloads are valid and accurate
    - _Requirements: 10.1, 10.2_

- [ ] 16. Create comprehensive test suites
  - [ ] 16.1 Implement backend integration tests
    - Create end-to-end tests for all status code scenarios
    - Test authentication and authorization flows across modules
    - Verify business logic error handling with proper status codes
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ] 16.2 Implement frontend integration tests  
    - Create component integration tests with API error scenarios
    - Test error boundary functionality and fallback displays
    - Verify user experience flows with different error types
    - _Requirements: 2.1, 3.1, 5.1_

- [ ] 17. Final checkpoint and validation
  - [ ] 17.1 Execute comprehensive test validation
    - Run all property-based tests for universal behaviors
    - Execute example-based tests for specific business scenarios
    - Verify API documentation matches implementation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 17.2 Perform integration testing with existing clients
    - Test backward compatibility with existing API consumers
    - Verify enhanced error responses don't break client applications
    - Validate monitoring and logging integration
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability  
- Checkpoints ensure incremental validation of core functionality
- Property tests validate universal correctness properties from the design
- Unit tests and integration tests validate specific examples and edge cases
- The implementation maintains backward compatibility throughout the rollout
- Both backend Laravel/PHP and frontend React/JavaScript components are covered

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "3.2"] },
    { "id": 2, "tasks": ["1.4", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "5.1", "12.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "12.2"] },
    { "id": 5, "tasks": ["5.4", "6.1", "12.3", "13.1"] },
    { "id": 6, "tasks": ["6.2", "13.2", "13.3"] },
    { "id": 7, "tasks": ["6.3", "7.1", "13.4"] },
    { "id": 8, "tasks": ["7.2", "14.1"] },
    { "id": 9, "tasks": ["7.3", "8.1", "14.2"] },
    { "id": 10, "tasks": ["8.2", "14.3"] },
    { "id": 11, "tasks": ["8.3", "9.1"] },
    { "id": 12, "tasks": ["9.2", "10.1"] },
    { "id": 13, "tasks": ["15.1"] },
    { "id": 14, "tasks": ["15.2", "16.1"] },
    { "id": 15, "tasks": ["15.3", "16.2"] },
    { "id": 16, "tasks": ["17.1"] },
    { "id": 17, "tasks": ["17.2"] }
  ]
}
```