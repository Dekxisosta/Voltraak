# Inventory API Contracts

## Overview
The Inventory API provides comprehensive inventory management operations including products, batches, stock transactions, physical counts, and FEFO-enforced operations for WalangBrownout Appliances.

## Base Configuration
- **Base URL**: `/api/inventory`
- **Authentication**: Bearer token required for all endpoints
- **Content Type**: `application/json`

---

## Products Management

### GET `/products` - List Products

#### Purpose
Retrieve paginated list of products with filtering and search capabilities.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "per_page": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 15
    },
    "search": {
      "type": "string",
      "description": "Search in name, SKU, description"
    },
    "category": {
      "type": "string",
      "description": "Filter by product category"
    },
    "is_seasonal": {
      "type": "boolean",
      "description": "Filter seasonal products"
    },
    "low_stock": {
      "type": "boolean",
      "description": "Show only products below reorder point"
    },
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "discontinued"]
    },
    "sort_by": {
      "type": "string",
      "enum": ["name", "sku", "category", "stock_level", "created_at"],
      "default": "name"
    },
    "sort_direction": {
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "asc"
    }
  }
}
```

#### Response Contract

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "products": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Product"
      }
    },
    "pagination": {
      "$ref": "#/components/schemas/PaginationMeta"
    }
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### POST `/products` - Create Product

#### Purpose
Create a new product with initial inventory settings.

#### Request Contract

##### Authorization
- **Required Role**: `inventory_staff` or higher

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["name", "sku", "category", "unit_price"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "description": "Product name"
    },
    "sku": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "pattern": "^[A-Z0-9-]+$",
      "description": "Stock Keeping Unit (must be unique)"
    },
    "description": {
      "type": "string",
      "maxLength": 1000,
      "nullable": true
    },
    "category": {
      "type": "string",
      "maxLength": 100,
      "description": "Product category"
    },
    "unit_price": {
      "type": "number",
      "minimum": 0,
      "multipleOf": 0.01,
      "description": "Price per unit in currency"
    },
    "cost_price": {
      "type": "number",
      "minimum": 0,
      "multipleOf": 0.01,
      "nullable": true
    },
    "storage_location": {
      "type": "string",
      "maxLength": 50,
      "nullable": true,
      "description": "Default storage bin/location"
    },
    "is_seasonal": {
      "type": "boolean",
      "default": false
    },
    "seasonal_months": {
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 1,
        "maximum": 12
      },
      "description": "Months when product is in season (1-12)"
    },
    "reorder_point": {
      "type": "integer",
      "minimum": 0,
      "default": 10
    },
    "reorder_quantity": {
      "type": "integer",
      "minimum": 0,
      "default": 50
    },
    "minimum_stock_level": {
      "type": "integer",
      "minimum": 0,
      "default": 5
    },
    "maximum_stock_level": {
      "type": "integer",
      "minimum": 0,
      "nullable": true
    },
    "weight": {
      "type": "number",
      "minimum": 0,
      "nullable": true,
      "description": "Weight per unit in kg"
    },
    "dimensions": {
      "type": "object",
      "properties": {
        "length": {"type": "number", "minimum": 0},
        "width": {"type": "number", "minimum": 0},
        "height": {"type": "number", "minimum": 0}
      },
      "nullable": true
    },
    "barcode": {
      "type": "string",
      "maxLength": 50,
      "nullable": true
    },
    "supplier_id": {
      "type": "integer",
      "nullable": true,
      "description": "Primary supplier"
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "$ref": "#/components/schemas/Product"
    }
  },
  "timestamp": "2024-01-15T10:05:00Z"
}
```

##### Error Responses

**422 Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "sku": ["The SKU has already been taken."],
    "unit_price": ["The unit price must be greater than 0."]
  },
  "timestamp": "2024-01-15T10:05:00Z"
}
```

#### Business Rules
1. **SKU Uniqueness**: SKU must be unique across all products
2. **Pricing Validation**: Unit price must be greater than cost price (if provided)
3. **Seasonal Logic**: If `is_seasonal` is true, `seasonal_months` must be provided
4. **Stock Level Logic**: `minimum_stock_level` ≤ `reorder_point` ≤ `maximum_stock_level`
5. **Audit Trail**: All product creations logged with user ID

---

## Batches Management

### GET `/batches` - List Batches

#### Purpose
Retrieve batches with expiry status and FEFO ordering.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "integer",
      "description": "Filter by specific product"
    },
    "status": {
      "type": "string",
      "enum": ["safe", "warning", "expired"],
      "description": "Filter by expiry status"
    },
    "location": {
      "type": "string",
      "description": "Filter by storage location"
    },
    "expiry_within_days": {
      "type": "integer",
      "minimum": 0,
      "description": "Show batches expiring within X days"
    },
    "available_only": {
      "type": "boolean",
      "default": false,
      "description": "Show only batches with available quantity > 0"
    }
  }
}
```

#### Response Contract

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "batches": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Batch"
      }
    }
  }
}
```

### POST `/batches` - Create Batch

#### Purpose
Create new batch during stock receipt.

#### Request Contract

##### Authorization
- **Required Role**: `warehouse` or higher

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["product_id", "batch_number", "quantity", "manufacture_date", "expiry_date"],
  "properties": {
    "product_id": {
      "type": "integer",
      "description": "Reference to product"
    },
    "batch_number": {
      "type": "string",
      "maxLength": 100,
      "description": "Unique batch identifier"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1,
      "description": "Initial quantity received"
    },
    "manufacture_date": {
      "type": "string",
      "format": "date",
      "description": "Date of manufacture"
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Expiration date"
    },
    "supplier_batch_code": {
      "type": "string",
      "maxLength": 100,
      "nullable": true
    },
    "storage_location": {
      "type": "string",
      "maxLength": 50,
      "nullable": true
    },
    "quality_notes": {
      "type": "string",
      "maxLength": 500,
      "nullable": true
    },
    "received_by": {
      "type": "integer",
      "description": "User ID of receiver"
    },
    "purchase_order_id": {
      "type": "integer",
      "nullable": true,
      "description": "Reference to PO if applicable"
    }
  }
}
```

#### Business Rules
1. **FEFO Enforcement**: System automatically calculates expiry status
2. **Date Validation**: Expiry date must be after manufacture date
3. **Batch Uniqueness**: Batch number + product combination must be unique
4. **Automatic Status**: Status calculated based on days to expiry (>60: safe, ≤60: warning, ≤0: expired)
5. **Stock Update**: Automatically updates product stock levels

---

## Stock Transactions

### POST `/stock-in` - Record Stock Receipt

#### Purpose
Record incoming stock, create/update batches, and log transaction.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["product_id", "quantity", "batch_info"],
  "properties": {
    "product_id": {
      "type": "integer"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1
    },
    "batch_info": {
      "type": "object",
      "required": ["batch_number", "manufacture_date", "expiry_date"],
      "properties": {
        "batch_number": {"type": "string"},
        "manufacture_date": {"type": "string", "format": "date"},
        "expiry_date": {"type": "string", "format": "date"},
        "supplier_batch_code": {"type": "string", "nullable": true}
      }
    },
    "reference_number": {
      "type": "string",
      "description": "PO number or delivery note"
    },
    "notes": {
      "type": "string",
      "maxLength": 500
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "Stock received successfully",
  "data": {
    "transaction": {
      "$ref": "#/components/schemas/StockTransaction"
    },
    "batch": {
      "$ref": "#/components/schemas/Batch"
    },
    "updated_stock": {
      "product_id": 1,
      "current_quantity": 150,
      "available_quantity": 145,
      "reserved_quantity": 5
    }
  }
}
```

### POST `/stock-out` - Record Stock Issue

#### Purpose
Record outgoing stock with FEFO batch selection.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["product_id", "quantity"],
  "properties": {
    "product_id": {
      "type": "integer"
    },
    "quantity": {
      "type": "integer",
      "minimum": 1
    },
    "reason": {
      "type": "string",
      "enum": ["sale", "transfer", "damage", "adjustment", "sample"],
      "default": "sale"
    },
    "customer_order_id": {
      "type": "integer",
      "nullable": true
    },
    "batch_id": {
      "type": "integer",
      "nullable": true,
      "description": "Specific batch (overrides FEFO if provided)"
    },
    "reference_number": {
      "type": "string",
      "description": "Sales order or transfer note"
    },
    "notes": {
      "type": "string",
      "maxLength": 500
    }
  }
}
```

#### Business Rules
1. **FEFO Selection**: If batch_id not specified, system selects oldest expiry batch first
2. **Availability Check**: Ensures sufficient available (non-reserved) stock
3. **Batch Splitting**: Can split across multiple batches if needed
4. **Status Validation**: Cannot issue from expired batches unless reason is "damage"

---

## Physical Counts & Variance

### POST `/physical-counts` - Submit Physical Count

#### Purpose
Submit cycle count and automatically calculate variance.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["product_id", "counted_quantity"],
  "properties": {
    "product_id": {
      "type": "integer"
    },
    "counted_quantity": {
      "type": "integer",
      "minimum": 0,
      "description": "Actual counted quantity"
    },
    "count_date": {
      "type": "string",
      "format": "date-time",
      "default": "now()"
    },
    "location": {
      "type": "string",
      "description": "Storage location counted"
    },
    "batch_breakdown": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "batch_id": {"type": "integer"},
          "counted_quantity": {"type": "integer", "minimum": 0}
        }
      },
      "description": "Optional batch-level count breakdown"
    },
    "notes": {
      "type": "string",
      "maxLength": 500
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "Physical count recorded",
  "data": {
    "physical_count": {
      "$ref": "#/components/schemas/PhysicalCount"
    },
    "variance_analysis": {
      "system_quantity": 100,
      "counted_quantity": 95,
      "variance_quantity": -5,
      "variance_percentage": -5.0,
      "accuracy_percentage": 95.0,
      "exceeds_threshold": false,
      "shrinkage_value": 25.50
    },
    "auto_actions": {
      "adjustment_created": true,
      "alert_generated": false,
      "supervisor_notified": false
    }
  }
}
```

#### Business Rules
1. **Automatic Variance Calculation**: System computes variance against current stock
2. **Threshold Alerting**: Variance >5% triggers supervisor notification
3. **Auto-Adjustment**: Creates stock adjustment transaction if variance confirmed
4. **Audit Trail**: Full audit trail of count vs system records
5. **Batch Reconciliation**: If batch breakdown provided, validates against system records

---

## Components Schemas

### Product Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "sku": {"type": "string"},
    "description": {"type": "string", "nullable": true},
    "category": {"type": "string"},
    "unit_price": {"type": "number"},
    "cost_price": {"type": "number", "nullable": true},
    "current_stock": {"type": "integer"},
    "available_stock": {"type": "integer"},
    "reserved_stock": {"type": "integer"},
    "reorder_point": {"type": "integer"},
    "reorder_quantity": {"type": "integer"},
    "stock_status": {
      "type": "string",
      "enum": ["in_stock", "low_stock", "out_of_stock", "critical"]
    },
    "is_seasonal": {"type": "boolean"},
    "seasonal_months": {"type": "array", "items": {"type": "integer"}},
    "storage_location": {"type": "string", "nullable": true},
    "last_restocked_at": {"type": "string", "format": "date-time", "nullable": true},
    "batches_count": {"type": "integer"},
    "expiring_batches_count": {"type": "integer"},
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```

### Batch Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "product_id": {"type": "integer"},
    "batch_number": {"type": "string"},
    "quantity": {"type": "integer"},
    "available_quantity": {"type": "integer"},
    "reserved_quantity": {"type": "integer"},
    "manufacture_date": {"type": "string", "format": "date"},
    "expiry_date": {"type": "string", "format": "date"},
    "status": {
      "type": "string",
      "enum": ["safe", "warning", "expired"]
    },
    "days_to_expiry": {"type": "integer"},
    "supplier_batch_code": {"type": "string", "nullable": true},
    "storage_location": {"type": "string", "nullable": true},
    "quality_notes": {"type": "string", "nullable": true},
    "received_at": {"type": "string", "format": "date-time"},
    "received_by": {"type": "integer"},
    "product": {
      "type": "object",
      "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"},
        "sku": {"type": "string"}
      }
    }
  }
}
```

### StockTransaction Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "product_id": {"type": "integer"},
    "batch_id": {"type": "integer", "nullable": true},
    "type": {
      "type": "string",
      "enum": ["stock_in", "stock_out", "transfer", "adjustment", "damage"]
    },
    "quantity": {"type": "integer"},
    "reason": {"type": "string"},
    "reference_number": {"type": "string", "nullable": true},
    "notes": {"type": "string", "nullable": true},
    "user_id": {"type": "integer"},
    "created_at": {"type": "string", "format": "date-time"},
    "product": {"$ref": "#/components/schemas/Product"},
    "batch": {"$ref": "#/components/schemas/Batch"},
    "user": {
      "type": "object",
      "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"}
      }
    }
  }
}
```

### PhysicalCount Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "product_id": {"type": "integer"},
    "system_quantity": {"type": "integer"},
    "counted_quantity": {"type": "integer"},
    "variance_quantity": {"type": "integer"},
    "variance_percentage": {"type": "number"},
    "accuracy_percentage": {"type": "number"},
    "count_date": {"type": "string", "format": "date-time"},
    "location": {"type": "string", "nullable": true},
    "notes": {"type": "string", "nullable": true},
    "counted_by": {"type": "integer"},
    "verified_by": {"type": "integer", "nullable": true},
    "status": {
      "type": "string",
      "enum": ["pending", "verified", "adjusted"]
    },
    "created_at": {"type": "string", "format": "date-time"}
  }
}
```

## Error Handling

### Common Error Responses

**403 Forbidden - Insufficient Permissions**
```json
{
  "success": false,
  "message": "Insufficient permissions for this operation",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**404 Not Found - Resource Not Found**
```json
{
  "success": false,
  "message": "Product not found",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**409 Conflict - Business Rule Violation**
```json
{
  "success": false,
  "message": "Cannot issue stock from expired batch",
  "details": {
    "batch_id": 123,
    "batch_status": "expired",
    "expiry_date": "2024-01-10"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```