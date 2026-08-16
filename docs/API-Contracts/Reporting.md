# Reporting API Contracts

## Overview
The Reporting API provides comprehensive analytics, KPI dashboards, and exportable reports for inventory management, procurement analysis, and business intelligence for WalangBrownout Appliances.

## Base Configuration
- **Base URL**: `/api/reports`
- **Authentication**: Bearer token required for all endpoints
- **Content Type**: `application/json`
- **Export Formats**: JSON, CSV, PDF

---

## Dashboard & KPIs

### GET `/dashboard/kpi` - Key Performance Indicators

#### Purpose
Retrieve real-time KPIs for manager dashboard overview.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "period": {
      "type": "string",
      "enum": ["today", "week", "month", "quarter", "year"],
      "default": "month",
      "description": "Time period for calculations"
    },
    "compare_previous": {
      "type": "boolean",
      "default": true,
      "description": "Include previous period comparison"
    },
    "refresh_cache": {
      "type": "boolean",
      "default": false,
      "description": "Force refresh cached metrics"
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
    "inventory_metrics": {
      "$ref": "#/components/schemas/InventoryKPIs"
    },
    "financial_metrics": {
      "$ref": "#/components/schemas/FinancialKPIs"
    },
    "operational_metrics": {
      "$ref": "#/components/schemas/OperationalKPIs"
    },
    "alerts": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/KPIAlert"
      }
    },
    "period_info": {
      "current_period": {
        "start_date": "2024-01-01",
        "end_date": "2024-01-31",
        "days": 31
      },
      "previous_period": {
        "start_date": "2023-12-01", 
        "end_date": "2023-12-31",
        "days": 31
      }
    },
    "last_updated": "2024-01-15T10:00:00Z",
    "cache_expires": "2024-01-15T11:00:00Z"
  }
}
```

#### Business Rules
1. **Real-time Calculation**: KPIs calculated from live data with 1-hour cache
2. **Comparison Logic**: Previous period comparison uses same date range length
3. **Alert Generation**: Automatic alerts for metrics exceeding thresholds
4. **Role Security**: Manager-only access to financial metrics
5. **Performance**: Optimized queries with database indexing

---

## Inventory Reports

### GET `/inventory/summary` - Inventory Summary Report

#### Purpose
Comprehensive inventory status report with category breakdowns and aging analysis.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "format": "date",
      "description": "Report as of date (default: today)"
    },
    "category": {
      "type": "string",
      "description": "Filter by product category"
    },
    "location": {
      "type": "string",
      "description": "Filter by storage location"
    },
    "include_inactive": {
      "type": "boolean",
      "default": false
    },
    "valuation_method": {
      "type": "string",
      "enum": ["fifo", "weighted_average", "latest_cost"],
      "default": "fifo"
    },
    "group_by": {
      "type": "string",
      "enum": ["category", "location", "supplier", "none"],
      "default": "category"
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
    "report_metadata": {
      "report_date": "2024-01-15",
      "total_products": 150,
      "total_categories": 8,
      "valuation_method": "fifo",
      "generated_at": "2024-01-15T10:30:00Z"
    },
    "summary": {
      "$ref": "#/components/schemas/InventorySummary"
    },
    "category_breakdown": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/CategorySummary"
      }
    },
    "aging_analysis": {
      "$ref": "#/components/schemas/AgingAnalysis"
    },
    "low_stock_items": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/LowStockItem"
      }
    },
    "expiring_batches": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ExpiringBatch"
      }
    }
  }
}
```

### GET `/inventory/movement` - Inventory Movement Report

#### Purpose
Detailed analysis of inventory movements over time period.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "required": ["start_date", "end_date"],
  "properties": {
    "start_date": {
      "type": "string",
      "format": "date"
    },
    "end_date": {
      "type": "string", 
      "format": "date"
    },
    "product_id": {
      "type": "integer",
      "description": "Filter by specific product"
    },
    "movement_type": {
      "type": "string",
      "enum": ["stock_in", "stock_out", "transfer", "adjustment", "all"],
      "default": "all"
    },
    "group_by_period": {
      "type": "string",
      "enum": ["day", "week", "month"],
      "default": "day"
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
    "movement_summary": {
      "total_transactions": 1250,
      "total_in": 5000,
      "total_out": 4750,
      "net_movement": 250,
      "average_daily_movement": 87.5
    },
    "period_breakdown": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "period": {"type": "string"},
          "stock_in": {"type": "integer"},
          "stock_out": {"type": "integer"},
          "net_movement": {"type": "integer"},
          "transactions_count": {"type": "integer"}
        }
      }
    },
    "top_moving_products": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ProductMovement"
      }
    },
    "movement_by_reason": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "reason": {"type": "string"},
          "quantity": {"type": "integer"},
          "percentage": {"type": "number"}
        }
      }
    }
  }
}
```

---

## Forecasting & Analytics

### GET `/forecast/demand` - Demand Forecast Report

#### Purpose
8-week demand forecast with seasonal adjustments and confidence intervals.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "integer",
      "description": "Forecast for specific product"
    },
    "category": {
      "type": "string",
      "description": "Forecast for product category"
    },
    "forecast_weeks": {
      "type": "integer",
      "minimum": 4,
      "maximum": 16,
      "default": 8,
      "description": "Number of weeks to forecast"
    },
    "include_seasonal": {
      "type": "boolean",
      "default": true,
      "description": "Apply seasonal adjustments"
    },
    "confidence_level": {
      "type": "number",
      "enum": [0.8, 0.85, 0.9, 0.95],
      "default": 0.9,
      "description": "Forecast confidence level"
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
    "forecast_metadata": {
      "algorithm": "exponential_smoothing",
      "data_points_used": 52,
      "forecast_accuracy": 0.87,
      "last_training_date": "2024-01-14",
      "confidence_level": 0.9
    },
    "forecasts": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/DemandForecast"
      }
    },
    "historical_accuracy": {
      "type": "object",
      "properties": {
        "mean_absolute_error": {"type": "number"},
        "mean_absolute_percentage_error": {"type": "number"},
        "forecast_bias": {"type": "number"}
      }
    },
    "seasonal_patterns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "month": {"type": "integer"},
          "seasonal_index": {"type": "number"},
          "pattern_strength": {"type": "string"}
        }
      }
    }
  }
}
```

#### Business Rules
1. **Algorithm**: Uses exponential smoothing with trend and seasonal components
2. **Data Requirements**: Minimum 12 weeks historical data for reliable forecast
3. **Seasonal Adjustment**: Applies learned seasonal patterns to base forecast
4. **Confidence Intervals**: Uses historical forecast errors for interval calculation
5. **Accuracy Tracking**: Continuously validates forecast accuracy against actual demand

---

## Procurement Analytics

### GET `/procurement/analysis` - Procurement Analysis Report

#### Purpose
Comprehensive procurement performance analysis with supplier metrics.

#### Request Contract

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "period": {
      "type": "string",
      "enum": ["month", "quarter", "year"],
      "default": "quarter"
    },
    "supplier_id": {
      "type": "integer",
      "description": "Filter by specific supplier"
    },
    "include_cancelled": {
      "type": "boolean",
      "default": false
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
    "procurement_summary": {
      "total_orders": 45,
      "total_value": 125750.00,
      "average_order_value": 2794.44,
      "on_time_delivery_rate": 0.89,
      "average_lead_time": 7.2
    },
    "supplier_performance": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/SupplierPerformance"
      }
    },
    "spending_analysis": {
      "by_category": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "category": {"type": "string"},
            "amount": {"type": "number"},
            "percentage": {"type": "number"},
            "orders_count": {"type": "integer"}
          }
        }
      },
      "by_month": {
        "type": "array",
        "items": {
          "type": "object", 
          "properties": {
            "month": {"type": "string"},
            "amount": {"type": "number"},
            "orders_count": {"type": "integer"}
          }
        }
      }
    }
  }
}
```

---

## Export Functionality

### GET `/export/{report_type}` - Export Reports

#### Purpose
Export reports in various formats (CSV, PDF, Excel).

#### Request Contract

##### Path Parameters
```json
{
  "report_type": {
    "type": "string",
    "enum": ["inventory_summary", "movement", "forecast", "procurement", "kpi_dashboard"]
  }
}
```

##### Query Parameters
```json
{
  "type": "object",
  "required": ["format"],
  "properties": {
    "format": {
      "type": "string",
      "enum": ["csv", "pdf", "xlsx"]
    },
    "filters": {
      "type": "object",
      "description": "Same filters as the corresponding report endpoint"
    },
    "template": {
      "type": "string",
      "enum": ["standard", "summary", "detailed"],
      "default": "standard"
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
    "download_url": "https://api.voltraak.com/downloads/inventory_report_20240115.xlsx",
    "file_name": "inventory_report_20240115.xlsx",
    "file_size": 2048576,
    "expires_at": "2024-01-15T18:00:00Z",
    "format": "xlsx"
  }
}
```

#### Business Rules
1. **File Generation**: Reports generated asynchronously for large datasets
2. **Temporary Storage**: Export files stored temporarily (24 hours)
3. **Access Control**: Download URLs are signed and expire
4. **Format Optimization**: Different formats optimized for specific use cases
5. **Size Limits**: Large reports split into multiple files

---

## Component Schemas

### InventoryKPIs Schema
```json
{
  "type": "object",
  "properties": {
    "total_skus": {
      "current": 150,
      "previous": 147,
      "change_percent": 2.04
    },
    "stock_accuracy": {
      "current": 97.2,
      "previous": 94.8,
      "change_percent": 2.53,
      "target": 98.0,
      "status": "approaching_target"
    },
    "shrinkage_rate": {
      "current": 2.1,
      "previous": 5.7,
      "change_percent": -63.16,
      "target": 2.0,
      "status": "exceeds_target"
    },
    "stockout_incidents": {
      "current": 3,
      "previous": 8,
      "change_percent": -62.5
    },
    "expiry_writeoffs": {
      "current": 1250.00,
      "previous": 15000.00,
      "change_percent": -91.67,
      "target": 1000.00
    }
  }
}
```

### FinancialKPIs Schema
```json
{
  "type": "object",
  "properties": {
    "inventory_value": {
      "current": 2875430.00,
      "previous": 2650000.00,
      "change_percent": 8.51,
      "by_category": {
        "appliances": 1890000.00,
        "parts": 520000.00,
        "accessories": 465430.00
      }
    },
    "inventory_turnover": {
      "current": 8.2,
      "previous": 6.8,
      "change_percent": 20.59,
      "target": 8.0
    },
    "carrying_cost": {
      "current": 23800.00,
      "previous": 25200.00,
      "change_percent": -5.56
    },
    "procurement_spend": {
      "current": 125750.00,
      "previous": 98500.00,
      "change_percent": 27.66
    }
  }
}
```

### DemandForecast Schema
```json
{
  "type": "object",
  "properties": {
    "product_id": 1,
    "product": {
      "id": 1,
      "name": "Samsung Refrigerator 21cu",
      "sku": "SAMSUNG-RF21",
      "category": "Appliances"
    },
    "weekly_forecasts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "week_start": {"type": "string", "format": "date"},
          "week_number": {"type": "integer"},
          "forecast_demand": {"type": "number"},
          "confidence_lower": {"type": "number"},
          "confidence_upper": {"type": "number"},
          "seasonal_factor": {"type": "number"},
          "trend_component": {"type": "number"}
        }
      }
    },
    "total_forecast": {
      "8_week_demand": 45.2,
      "seasonal_adjustment": 1.15,
      "confidence_interval": [38.1, 52.3]
    },
    "reorder_recommendation": {
      "suggested_order_quantity": 50,
      "order_timing": "2024-01-22",
      "safety_buffer": 8
    }
  }
}
```

### SupplierPerformance Schema
```json
{
  "type": "object",
  "properties": {
    "supplier_id": 1,
    "supplier_name": "ABC Electronics Supply",
    "metrics": {
      "total_orders": 12,
      "total_value": 45750.00,
      "on_time_delivery_rate": 0.92,
      "quality_score": 4.6,
      "average_lead_time": 6.5,
      "price_competitiveness": 0.87
    },
    "trends": {
      "delivery_performance": "improving",
      "quality_trend": "stable",
      "pricing_trend": "increasing"
    },
    "last_order_date": "2024-01-10",
    "payment_status": "current",
    "preferred_status": true
  }
}
```

## Performance & Caching

### Caching Strategy
1. **KPI Cache**: 1-hour cache for dashboard metrics
2. **Report Cache**: 15-minute cache for standard reports
3. **Export Cache**: 5-minute cache for export generation
4. **Forecast Cache**: 24-hour cache for demand forecasts

### Performance Optimizations
1. **Database Indexing**: Optimized indexes for date ranges and aggregations
2. **Query Optimization**: Materialized views for complex calculations
3. **Pagination**: All list endpoints support pagination
4. **Async Processing**: Large reports generated asynchronously
5. **CDN**: Static exports served via CDN

### Rate Limiting
- **Standard Reports**: 60 requests per hour per user
- **Export Requests**: 10 exports per hour per user
- **KPI Dashboard**: 120 requests per hour per user