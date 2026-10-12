# Core Module Documentation

The Core module provides foundational services, utilities, and infrastructure that are shared across all business modules in the Inventory Management System.

## Architecture

The Core module follows a service-oriented architecture where each concern is encapsulated in its own service class. All services are registered as singletons in the Laravel service container for optimal performance.

## Services Overview

### 1. StatusCodeService (`Services/StatusCodeService.php`)

**Purpose**: Centralized HTTP status code management and standardized API response formatting.

**Key Features**:
- Standardized success/error response formats
- Status code validation against allowed codes
- Convenience methods for common HTTP responses
- Consistent timestamp and structure across all responses

**Usage**:
```php
// Success responses
$statusCodeService->ok($data);
$statusCodeService->created($data);
$statusCodeService->noContent();

// Error responses  
$statusCodeService->badRequest('Invalid input');
$statusCodeService->unauthorized('Authentication required');
$statusCodeService->notFound('Resource not found', 'Product');
```

### 2. JwtService (`Auth/JwtService.php`)

**Purpose**: JWT token generation, validation, and management for API authentication.

**Key Features**:
- Secure token generation with user context
- Token validation and expiry checking
- Automatic token refresh functionality
- Integration with Laravel authentication system

**Usage**:
```php
// Generate token for user
$token = $jwtService->generateToken($user);

// Validate token
$payload = $jwtService->validateToken($token);

// Get user from token
$user = $jwtService->getUserFromToken($token);
```

### 3. PermissionService (`Permissions/PermissionService.php`)

**Purpose**: Role-based access control (RBAC) with hierarchical permissions.

**Key Features**:
- Three-tier role hierarchy (Warehouse → Inventory → Manager)
- Permission inheritance (higher roles inherit lower role permissions)
- Feature-based access control
- Endpoint-level permission checking

**Usage**:
```php
// Check specific permission
$canManage = $permissionService->hasPermission($user, 'manage_products');

// Check feature access
$hasAccess = $permissionService->hasFeatureAccess($user, 'inventory');

// Check endpoint access
$canAccess = $permissionService->canAccessEndpoint($user, 'POST', '/products');
```

### 4. ActivityLogger (`Logging/ActivityLogger.php`)

**Purpose**: Comprehensive activity logging for audit trails and system monitoring.

**Key Features**:
- Multi-channel logging (api, inventory, procurement)
- Activity categorization (user actions, security events, business rule violations)
- Performance metrics logging
- Critical event alerting

**Usage**:
```php
// Log user activity
$activityLogger->logActivity('create', 'product', $user, $context);

// Log inventory operations
$activityLogger->logInventoryOperation('stock_in', 'WIDGET-001', 50, $user);

// Log security events
$activityLogger->logSecurityEvent('unauthorized_access', 'warning', $user);
```

### 5. NotificationService (`Notifications/NotificationService.php`)

**Purpose**: System-wide notification management for alerts and user communications.

**Key Features**:
- Role-based notification targeting
- Priority-based message categorization
- Business-specific alert types (low stock, expiry, variance)
- Bulk notification support

**Usage**:
```php
// Send low stock alert
$notificationService->sendLowStockAlert('Widget A', 'WID-001', 5, 10);

// Send expiry warning
$notificationService->sendExpiryWarning('Widget A', 'BATCH-001', $expiryDate);

// Send variance alert
$notificationService->sendVarianceAlert('Widget A', 'WID-001', 50, 45, 10.0);
```

### 6. ValidationService (`Shared/ValidationService.php`)

**Purpose**: Centralized validation for business rules and data integrity.

**Key Features**:
- Domain-specific validation rules
- Business logic validation (FEFO, stock levels, variance thresholds)
- Consistent error message formatting
- Integration with Laravel validation

**Usage**:
```php
// Validate stock transaction
$validated = $validationService->validateStockTransaction($data);

// Validate product data
$validated = $validationService->validateProduct($data, $productId);

// Validate business rules
$validationService->validateStockOperation($stockData);
```

## Exception Hierarchy

### ApiException (`Exceptions/ApiException.php`)
Abstract base class for all API exceptions with standardized error handling.

### Concrete Exceptions
- **ValidationException**: 422 status for validation failures
- **ResourceNotFoundException**: 404 status for missing resources
- **ConflictException**: 409 status for business logic conflicts
- **ServiceUnavailableException**: 503 status for service outages

**Usage**:
```php
// Throw specific business exception
throw ConflictException::insufficientInventory($available, $requested, $product);

// Throw FEFO violation
throw ConflictException::fefoViolation($batchId, $earlierBatch);
```

## Middleware

### StatusCodeMiddleware (`Middleware/StatusCodeMiddleware.php`)
**Purpose**: Automatic logging of API responses with status codes for monitoring.

**Features**:
- Comprehensive request/response logging
- Performance metrics tracking
- Sensitive data masking
- Error context enrichment

## Events

### BaseEvent (`Events/BaseEvent.php`)
Abstract base class for all system events with consistent structure.

### Inventory Events (`Events/InventoryEvents.php`)
- `StockReceived`: Fired when stock is received
- `StockIssued`: Fired when stock is issued
- `LowStockDetected`: Fired when stock falls below reorder level
- `VarianceDetected`: Fired when physical count variance exceeds threshold
- `BatchExpiring`: Fired when batch enters warning period
- `FefoViolationAttempted`: Fired when FEFO rules are violated

## Controllers

### BaseController (`Controllers/BaseController.php`)
**Purpose**: Base class for all module controllers providing standardized response methods.

**Features**:
- Consistent response formatting using StatusCodeService
- Pagination support
- Common HTTP method helpers
- Error response standardization

**Usage**:
```php
class ProductController extends BaseController
{
    public function index()
    {
        $products = Product::paginate();
        return $this->ok($products);
    }
    
    public function store(Request $request)
    {
        $product = Product::create($request->validated());
        return $this->created($product);
    }
}
```

## Configuration

### JWT Configuration (`config/jwt.php`)
- Token secret and algorithm settings
- Expiration and refresh timeouts
- Issuer and audience configuration

### IMS Configuration (`config/ims.php`)
- Business rule settings (variance thresholds, expiry warnings)
- Pagination defaults
- Role and permission configuration

## Service Registration

All Core services are registered as singletons in `AppServiceProvider`:

```php
$this->app->singleton(StatusCodeService::class);
$this->app->singleton(JwtService::class);
$this->app->singleton(PermissionService::class);
$this->app->singleton(ActivityLogger::class);
$this->app->singleton(NotificationService::class);
$this->app->singleton(ValidationService::class);
```

## Testing

The Core module includes comprehensive unit tests:

- `StatusCodeServiceTest`: Response formatting and validation
- `PermissionServiceTest`: RBAC and permission checking
- `ExceptionHierarchyTest`: Exception handling and status codes

Run tests with:
```bash
php artisan test tests/Unit/Core/
```

## Usage Patterns

### 1. Controller Pattern
```php
class ExampleController extends BaseController
{
    public function __construct(
        StatusCodeService $statusCodeService,
        PermissionService $permissionService,
        ActivityLogger $activityLogger
    ) {
        parent::__construct($statusCodeService);
        $this->permissionService = $permissionService;
        $this->activityLogger = $activityLogger;
    }
    
    public function store(Request $request)
    {
        // Check permissions
        if (!$this->permissionService->hasPermission(auth()->user(), 'manage_products')) {
            return $this->forbidden();
        }
        
        // Validate and create
        $product = Product::create($request->validated());
        
        // Log activity
        $this->activityLogger->logActivity('create', 'product', auth()->user(), [
            'product_id' => $product->id
        ]);
        
        return $this->created($product);
    }
}
```

### 2. Service Layer Pattern
```php
class InventoryService
{
    public function __construct(
        private ValidationService $validationService,
        private ActivityLogger $activityLogger,
        private NotificationService $notificationService
    ) {}
    
    public function receiveStock(array $data): StockTransaction
    {
        // Validate
        $validated = $this->validationService->validateStockTransaction($data);
        
        // Process business logic
        $transaction = StockTransaction::create($validated);
        
        // Log and notify
        $this->activityLogger->logInventoryOperation('stock_received', $product->sku, $data['quantity']);
        
        if ($product->quantity <= $product->reorder_level) {
            $this->notificationService->sendLowStockAlert($product->name, $product->sku, $product->quantity, $product->reorder_level);
        }
        
        return $transaction;
    }
}
```

## Dependencies

- **Firebase JWT**: JWT token handling
- **Laravel Framework**: Base functionality
- **Carbon**: Date/time manipulation

## Security Considerations

- All sensitive data is masked in logs
- JWT tokens use secure algorithms and proper expiration
- Permission checks are enforced server-side
- Input validation prevents injection attacks
- Activity logging provides audit trails

## Performance

- Services are registered as singletons for efficiency
- Logging is channeled to prevent I/O bottlenecks  
- Caching can be added to permission checks for high-traffic scenarios
- Database queries in validation are optimized with proper indexing

## Extension Points

The Core module is designed for extensibility:

- Add new exception types by extending `ApiException`
- Create new events by extending `BaseEvent`
- Add custom validation rules to `ValidationService`
- Extend notification types in `NotificationService`
- Add new permissions to `PermissionService`