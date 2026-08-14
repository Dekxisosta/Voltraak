# API Contracts Documentation

## Overview

This directory contains comprehensive API contracts for the Voltraak Inventory Management System. Unlike basic endpoint documentation, these contracts provide detailed specifications including request/response schemas, validation rules, business logic, and security requirements.

## Contract Structure

Each API contract includes:

- **Request Contracts**: Detailed parameter schemas with validation rules
- **Response Contracts**: Complete response structures with all possible outcomes
- **Business Rules**: Domain-specific logic and constraints
- **Security Requirements**: Authentication, authorization, and audit requirements
- **Error Handling**: Comprehensive error scenarios and responses
- **Performance Considerations**: Caching, rate limiting, and optimization details

## Available Contracts

### 1. Authentication (`Authentication.md`)
- JWT-based authentication flow
- User login/logout/refresh operations
- Role-based access control foundation
- Security policies and audit requirements

### 2. Inventory Management (`Inventory.md`)
- Product catalog management
- Batch tracking with FEFO enforcement
- Stock transactions (in/out/transfer/adjustment)
- Physical counts and variance analysis
- Real-time stock level monitoring

### 3. Procurement (`Procurement.md`)
- Supplier relationship management
- Automated reorder point calculations
- Procurement request workflows
- Purchase order lifecycle management
- Receiving and fulfillment processes

### 4. Reporting & Analytics (`Reporting.md`)
- Real-time KPI dashboards
- Inventory analytics and summaries
- Demand forecasting algorithms
- Procurement performance analysis
- Export functionality (CSV, PDF, Excel)

### 5. User Management (`UserManagement.md`)
- User account administration
- Role and permission management
- Profile and preference settings
- Activity logging and audit trails
- Security and compliance features

## Key Features

### Schema Validation
All requests and responses include JSON Schema definitions for:
- Data type validation
- Required field enforcement
- Format validation (email, date, etc.)
- Business rule constraints
- Custom validation patterns

### Error Handling
Comprehensive error responses covering:
- Validation errors (422)
- Authentication failures (401)
- Authorization denied (403)
- Resource not found (404)
- Business rule violations (409)
- Rate limiting (429)
- Server errors (5xx)

### Security Specifications
Detailed security requirements including:
- Authentication mechanisms
- Authorization hierarchies
- Audit logging requirements
- Rate limiting policies
- Data protection measures

### Business Logic Documentation
Clear specification of:
- FEFO (First-Expired, First-Out) enforcement
- Reorder point calculations
- Seasonal demand adjustments
- Inventory variance thresholds
- Procurement approval workflows

## Usage Guidelines

### For Frontend Developers
1. Use request schemas to validate form inputs
2. Implement proper error handling for all error codes
3. Follow authentication patterns consistently
4. Cache responses according to cache headers

### For Backend Developers
1. Implement validation using provided schemas
2. Return responses matching exact contract specifications
3. Follow business rules as documented
4. Implement all security requirements

### For QA Teams
1. Use contracts as test specifications
2. Validate all request/response formats
3. Test error scenarios comprehensively
4. Verify security requirements

### For API Consumers
1. Follow request contracts exactly
2. Handle all documented response scenarios
3. Implement proper authentication flows
4. Respect rate limiting policies

## Business Context

### Role Hierarchy
```
Manager (Level 3)
├── Full system access
├── User management capabilities
├── Financial reporting access
└── Purchase order approval authority

Inventory Staff (Level 2)
├── Inventory management operations
├── Product and batch administration
├── Procurement request creation
└── Basic reporting access

Warehouse (Level 1)
├── Physical inventory operations
├── Stock receiving and issuing
├── Count submissions
└── Read-only data access
```

### Core Business Processes

#### FEFO Enforcement
The system enforces First-Expired, First-Out picking to minimize expiry write-offs:
- Automatic batch selection based on expiry dates
- Warning alerts for batches ≤60 days to expiry
- System prevention of expired batch usage
- Audit trail for all batch movements

#### Automated Procurement
Dynamic reorder point calculations drive procurement:
- ROP = (Average Daily Demand × Lead Time) + Safety Stock
- Seasonal adjustments for demand patterns
- Automatic procurement request generation
- Manager approval workflow

#### Variance Management
Physical count variance monitoring:
- Automatic variance calculation (counted vs system)
- Alert generation for >5% discrepancies
- Shrinkage rate tracking and reporting
- Supervisor notification workflows

## Integration Examples

### Authentication Flow
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@company.com',
    password: 'password123',
    remember: true
  })
});

const { data } = await response.json();
localStorage.setItem('api_token', data.api_token);

// Authenticated Request
const inventoryResponse = await fetch('/api/inventory/products', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
    'Accept': 'application/json'
  }
});
```

### Error Handling Pattern
```javascript
async function handleApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      switch (response.status) {
        case 401:
          // Redirect to login
          break;
        case 403:
          // Show permission error
          break;
        case 422:
          // Show validation errors
          displayValidationErrors(data.errors);
          break;
        default:
          // Show generic error
          showError(data.message);
      }
      return null;
    }
    
    return data;
  } catch (error) {
    // Handle network errors
    showError('Network error occurred');
    return null;
  }
}
```

## Performance Considerations

### Caching Strategy
- **Static Data**: Product catalogs cached for 1 hour
- **Dynamic Data**: Stock levels cached for 5 minutes
- **Reports**: Dashboard KPIs cached for 15 minutes
- **User Data**: Profile information cached for 30 minutes

### Pagination
All list endpoints support pagination:
```javascript
const params = new URLSearchParams({
  page: 1,
  per_page: 15,
  search: 'search term'
});

const response = await fetch(`/api/inventory/products?${params}`);
```

### Rate Limiting
- **Authentication**: 5 attempts per 5 minutes per IP
- **Standard API**: 1000 requests per hour per user
- **Reporting**: 100 requests per hour per user
- **Exports**: 10 exports per hour per user

## Validation Examples

### Request Validation
```javascript
// Product creation validation
const productSchema = {
  name: { required: true, minLength: 1, maxLength: 255 },
  sku: { required: true, pattern: '^[A-Z0-9-]+$' },
  unit_price: { required: true, type: 'number', minimum: 0 },
  category: { required: true, maxLength: 100 }
};

function validateProduct(data) {
  const errors = {};
  
  if (!data.name || data.name.length === 0) {
    errors.name = ['Name is required'];
  }
  
  if (!data.sku || !/^[A-Z0-9-]+$/.test(data.sku)) {
    errors.sku = ['SKU must contain only uppercase letters, numbers, and hyphens'];
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}
```

## Testing Guidelines

### Contract Testing
Each contract should be validated with:
1. **Schema Compliance**: All requests/responses match documented schemas
2. **Business Rule Validation**: All business logic constraints enforced
3. **Error Scenario Coverage**: All documented error cases tested
4. **Security Verification**: Authentication and authorization working correctly

### Example Test Cases
```javascript
describe('Product API Contract', () => {
  test('POST /products validates required fields', async () => {
    const invalidProduct = { name: '', sku: 'invalid_sku' };
    const response = await request(app)
      .post('/api/inventory/products')
      .send(invalidProduct)
      .expect(422);
      
    expect(response.body.errors.name).toContain('The name field is required.');
    expect(response.body.errors.sku).toContain('SKU must contain only uppercase letters, numbers, and hyphens.');
  });
});
```

## Migration from Endpoint Documentation

The API contracts replace the basic endpoint documentation (`docs/Backend/API.md`) with comprehensive specifications that include:

1. **Enhanced Detail**: Complete request/response schemas instead of basic descriptions
2. **Business Logic**: Documented rules and constraints for each operation
3. **Error Handling**: Comprehensive error scenarios and responses
4. **Security Specs**: Detailed authentication and authorization requirements
5. **Validation Rules**: JSON Schema definitions for all data structures

This provides a complete specification for API implementation, testing, and integration.