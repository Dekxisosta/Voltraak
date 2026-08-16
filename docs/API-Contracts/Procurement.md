# Procurement API Contracts

## Overview
The Procurement API manages supplier relationships, reorder point calculations, procurement requests, and purchase order workflows with automated ROP-based purchasing recommendations.

## Base Configuration
- **Base URL**: `/api/procurement`
- **Authentication**: Bearer token required for all endpoints
- **Content Type**: `application/json`

---

## Suppliers Management

### GET `/suppliers` - List Suppliers

#### Purpose
Retrieve list of active suppliers with contact information and performance metrics.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"],
      "description": "Filter by supplier status"
    },
    "search": {
      "type": "string",
      "description": "Search in name, contact person, email"
    },
    "sort_by": {
      "type": "string",
      "enum": ["name", "rating", "lead_time", "created_at"],
      "default": "name"
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
    "suppliers": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Supplier"
      }
    }
  }
}
```

### POST `/suppliers` - Create Supplier

#### Purpose
Add new supplier to the system with contact and payment details.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["name", "contact_person", "email", "phone"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "description": "Supplier company name"
    },
    "contact_person": {
      "type": "string",
      "maxLength": 255,
      "description": "Primary contact person"
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255
    },
    "phone": {
      "type": "string",
      "maxLength": 20
    },
    "address": {
      "type": "object",
      "properties": {
        "street": {"type": "string"},
        "city": {"type": "string"},
        "state": {"type": "string"},
        "postal_code": {"type": "string"},
        "country": {"type": "string", "default": "Philippines"}
      }
    },
    "payment_terms": {
      "type": "string",
      "enum": ["net_15", "net_30", "net_60", "cod", "prepaid"],
      "default": "net_30"
    },
    "lead_time_days": {
      "type": "integer",
      "minimum": 1,
      "maximum": 365,
      "default": 7,
      "description": "Standard delivery lead time in days"
    },
    "minimum_order_amount": {
      "type": "number",
      "minimum": 0,
      "nullable": true
    },
    "currency": {
      "type": "string",
      "enum": ["PHP", "USD"],
      "default": "PHP"
    },
    "tax_id": {
      "type": "string",
      "nullable": true
    },
    "website": {
      "type": "string",
      "format": "uri",
      "nullable": true
    },
    "notes": {
      "type": "string",
      "maxLength": 1000,
      "nullable": true
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "Supplier created successfully",
  "data": {
    "supplier": {
      "$ref": "#/components/schemas/Supplier"
    }
  }
}
```

---

## Reorder Points & Automated Procurement

### GET `/reorder-points` - Calculate Reorder Points

#### Purpose
Calculate dynamic reorder points for all products and identify items requiring replenishment.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "integer",
      "description": "Calculate for specific product only"
    },
    "category": {
      "type": "string",
      "description": "Calculate for specific category"
    },
    "below_rop_only": {
      "type": "boolean",
      "default": false,
      "description": "Show only products below reorder point"
    },
    "seasonal_adjustment": {
      "type": "boolean",
      "default": true,
      "description": "Apply seasonal demand adjustments"
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
    "reorder_analysis": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ReorderAnalysis"
      }
    },
    "summary": {
      "total_products_analyzed": 150,
      "products_below_rop": 12,
      "total_procurement_value": 45750.00,
      "seasonal_products_count": 8,
      "urgent_reorders": 3
    },
    "auto_generated_requests": {
      "type": "integer",
      "description": "Number of procurement requests auto-created"
    }
  }
}
```

#### Business Rules
1. **ROP Calculation**: ROP = (Average Daily Demand × Lead Time) + Safety Stock
2. **Seasonal Adjustment**: Increase demand by 25% during seasonal months
3. **Safety Stock**: 20% of average weekly demand
4. **Auto-Generation**: Creates procurement requests for items below ROP
5. **Lead Time Buffer**: Adds 2 days buffer to supplier lead times
6. **Minimum Order Quantities**: Respects supplier MOQ requirements

---

## Procurement Requests

### GET `/procurement-requests` - List Procurement Requests

#### Purpose
Retrieve list of system-generated and manual procurement requests.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "approved", "rejected", "converted_to_po"],
      "description": "Filter by request status"
    },
    "urgency": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "auto_generated": {
      "type": "boolean",
      "description": "Filter auto vs manual requests"
    },
    "date_range": {
      "type": "object",
      "properties": {
        "start_date": {"type": "string", "format": "date"},
        "end_date": {"type": "string", "format": "date"}
      }
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
    "procurement_requests": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ProcurementRequest"
      }
    },
    "aggregations": {
      "pending_count": 15,
      "total_value": 125750.00,
      "critical_count": 3,
      "auto_generated_count": 12
    }
  }
}
```

### POST `/procurement-requests` - Create Manual Request

#### Purpose
Create manual procurement request for specific products.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["items", "justification"],
  "properties": {
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["product_id", "requested_quantity"],
        "properties": {
          "product_id": {"type": "integer"},
          "requested_quantity": {"type": "integer", "minimum": 1},
          "urgency": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"],
            "default": "medium"
          },
          "justification": {"type": "string"},
          "preferred_supplier_id": {"type": "integer", "nullable": true}
        }
      }
    },
    "justification": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Reason for procurement request"
    },
    "required_by_date": {
      "type": "string",
      "format": "date",
      "description": "When items are needed"
    },
    "budget_code": {
      "type": "string",
      "nullable": true
    }
  }
}
```

### PATCH `/procurement-requests/{id}` - Approve/Reject Request

#### Purpose
Manager approval or rejection of procurement requests.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["action"],
  "properties": {
    "action": {
      "type": "string",
      "enum": ["approve", "reject"]
    },
    "comments": {
      "type": "string",
      "maxLength": 500,
      "description": "Manager comments/feedback"
    },
    "modifications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": {"type": "integer"},
          "approved_quantity": {"type": "integer"},
          "reason": {"type": "string"}
        }
      },
      "description": "Quantity modifications during approval"
    },
    "convert_to_po": {
      "type": "boolean",
      "default": false,
      "description": "Immediately convert to purchase order"
    }
  }
}
```

---

## Purchase Orders

### GET `/purchase-orders` - List Purchase Orders

#### Purpose
Retrieve purchase orders with filtering and status tracking.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["draft", "pending", "approved", "sent", "partially_received", "fulfilled", "cancelled"]
    },
    "supplier_id": {
      "type": "integer"
    },
    "date_range": {
      "type": "object",
      "properties": {
        "start_date": {"type": "string", "format": "date"},
        "end_date": {"type": "string", "format": "date"}
      }
    },
    "overdue_only": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### POST `/purchase-orders` - Create Purchase Order

#### Purpose
Create new purchase order from procurement requests or manually.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["supplier_id", "line_items"],
  "properties": {
    "supplier_id": {
      "type": "integer",
      "description": "Selected supplier"
    },
    "procurement_request_ids": {
      "type": "array",
      "items": {"type": "integer"},
      "description": "Source procurement requests"
    },
    "line_items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["product_id", "quantity", "unit_price"],
        "properties": {
          "product_id": {"type": "integer"},
          "quantity": {"type": "integer", "minimum": 1},
          "unit_price": {"type": "number", "minimum": 0},
          "description": {"type": "string"},
          "notes": {"type": "string", "nullable": true}
        }
      }
    },
    "expected_delivery_date": {
      "type": "string",
      "format": "date",
      "description": "Expected delivery date"
    },
    "shipping_address": {
      "type": "object",
      "properties": {
        "street": {"type": "string"},
        "city": {"type": "string"},
        "postal_code": {"type": "string"}
      }
    },
    "payment_terms": {
      "type": "string",
      "enum": ["net_15", "net_30", "net_60", "cod", "prepaid"]
    },
    "notes": {
      "type": "string",
      "maxLength": 1000,
      "nullable": true
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "Purchase order created successfully",
  "data": {
    "purchase_order": {
      "$ref": "#/components/schemas/PurchaseOrder"
    }
  }
}
```

### PATCH `/purchase-orders/{id}/approve` - Approve Purchase Order

#### Purpose
Manager approval of purchase orders before sending to supplier.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Request Body Schema
```json
{
  "type": "object",
  "properties": {
    "approved_amount": {
      "type": "number",
      "description": "Final approved amount (if different from requested)"
    },
    "approval_comments": {
      "type": "string",
      "maxLength": 500
    },
    "send_to_supplier": {
      "type": "boolean",
      "default": true,
      "description": "Send PO to supplier immediately after approval"
    }
  }
}
```

### POST `/purchase-orders/{id}/receive` - Receive Purchase Order

#### Purpose
Record receipt of goods against purchase order and update inventory.

#### Request Contract

##### Authorization
- **Required Role**: `warehouse` or higher

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["received_items"],
  "properties": {
    "received_items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["line_item_id", "received_quantity", "batch_info"],
        "properties": {
          "line_item_id": {"type": "integer"},
          "received_quantity": {"type": "integer", "minimum": 0},
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
          "quality_notes": {"type": "string", "nullable": true},
          "damage_notes": {"type": "string", "nullable": true}
        }
      }
    },
    "delivery_note_number": {
      "type": "string",
      "nullable": true
    },
    "received_by": {
      "type": "integer",
      "description": "User ID of receiver"
    },
    "receiving_notes": {
      "type": "string",
      "maxLength": 1000,
      "nullable": true
    },
    "partial_receipt": {
      "type": "boolean",
      "default": false,
      "description": "Is this a partial receipt"
    }
  }
}
```

#### Business Rules
1. **Automatic Stock-In**: Creates stock-in transactions for all received items
2. **Partial Receipts**: Supports multiple partial receipts until fully received
3. **Batch Creation**: Automatically creates new batches for received items
4. **PO Status Update**: Updates PO status (partially_received/fulfilled)
5. **Variance Tracking**: Records any quantity variances between ordered and received
6. **Quality Control**: Allows quality notes and damage reporting

---

## Component Schemas

### Supplier Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "contact_person": {"type": "string"},
    "email": {"type": "string"},
    "phone": {"type": "string"},
    "address": {
      "type": "object",
      "properties": {
        "street": {"type": "string"},
        "city": {"type": "string"},
        "state": {"type": "string"},
        "postal_code": {"type": "string"},
        "country": {"type": "string"}
      }
    },
    "payment_terms": {"type": "string"},
    "lead_time_days": {"type": "integer"},
    "minimum_order_amount": {"type": "number", "nullable": true},
    "currency": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"]
    },
    "rating": {"type": "number", "minimum": 1, "maximum": 5, "nullable": true},
    "performance_metrics": {
      "type": "object",
      "properties": {
        "on_time_delivery_rate": {"type": "number"},
        "quality_score": {"type": "number"},
        "average_lead_time": {"type": "number"},
        "total_orders": {"type": "integer"},
        "last_order_date": {"type": "string", "format": "date", "nullable": true}
      }
    },
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```

### ReorderAnalysis Schema
```json
{
  "type": "object",
  "properties": {
    "product_id": {"type": "integer"},
    "product": {
      "type": "object",
      "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"},
        "sku": {"type": "string"},
        "category": {"type": "string"}
      }
    },
    "current_stock": {"type": "integer"},
    "reorder_point": {"type": "integer"},
    "calculated_rop": {"type": "integer"},
    "suggested_order_quantity": {"type": "integer"},
    "demand_metrics": {
      "type": "object",
      "properties": {
        "average_daily_demand": {"type": "number"},
        "weekly_demand": {"type": "number"},
        "seasonal_multiplier": {"type": "number"},
        "lead_time_demand": {"type": "number"},
        "safety_stock": {"type": "integer"}
      }
    },
    "urgency_level": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "days_until_stockout": {"type": "integer", "nullable": true},
    "estimated_cost": {"type": "number"},
    "preferred_supplier": {
      "type": "object",
      "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"},
        "lead_time_days": {"type": "integer"}
      },
      "nullable": true
    },
    "requires_reorder": {"type": "boolean"},
    "last_reorder_date": {"type": "string", "format": "date", "nullable": true}
  }
}
```

### ProcurementRequest Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "request_number": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["pending", "approved", "rejected", "converted_to_po"]
    },
    "type": {
      "type": "string",
      "enum": ["auto_generated", "manual"]
    },
    "urgency": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "justification": {"type": "string"},
    "total_estimated_cost": {"type": "number"},
    "required_by_date": {"type": "string", "format": "date", "nullable": true},
    "requested_by": {"type": "integer"},
    "approved_by": {"type": "integer", "nullable": true},
    "approved_at": {"type": "string", "format": "date-time", "nullable": true},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": {"type": "integer"},
          "product": {"$ref": "#/components/schemas/Product"},
          "requested_quantity": {"type": "integer"},
          "approved_quantity": {"type": "integer", "nullable": true},
          "estimated_unit_cost": {"type": "number"},
          "urgency": {"type": "string"},
          "justification": {"type": "string"}
        }
      }
    },
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```

### PurchaseOrder Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "po_number": {"type": "string"},
    "supplier_id": {"type": "integer"},
    "supplier": {"$ref": "#/components/schemas/Supplier"},
    "status": {
      "type": "string",
      "enum": ["draft", "pending", "approved", "sent", "partially_received", "fulfilled", "cancelled"]
    },
    "total_amount": {"type": "number"},
    "tax_amount": {"type": "number"},
    "grand_total": {"type": "number"},
    "expected_delivery_date": {"type": "string", "format": "date", "nullable": true},
    "payment_terms": {"type": "string"},
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "product_id": {"type": "integer"},
          "product": {"$ref": "#/components/schemas/Product"},
          "quantity": {"type": "integer"},
          "unit_price": {"type": "number"},
          "line_total": {"type": "number"},
          "received_quantity": {"type": "integer"},
          "description": {"type": "string", "nullable": true}
        }
      }
    },
    "created_by": {"type": "integer"},
    "approved_by": {"type": "integer", "nullable": true},
    "approved_at": {"type": "string", "format": "date-time", "nullable": true},
    "sent_at": {"type": "string", "format": "date-time", "nullable": true},
    "notes": {"type": "string", "nullable": true},
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  }
}
```