# User Management API Contracts

## Overview
The User Management API provides comprehensive user administration, role-based access control, and user profile management for the Voltraak Inventory Management System.

## Base Configuration
- **Base URL**: `/api/users`
- **Authentication**: Bearer token required for all endpoints
- **Content Type**: `application/json`

---

## User Management

### GET `/users` - List Users

#### Purpose
Retrieve paginated list of system users with role and status information.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

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
      "description": "Search in name, email, department"
    },
    "role": {
      "type": "string",
      "enum": ["warehouse", "inventory_staff", "manager"],
      "description": "Filter by user role"
    },
    "status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"],
      "description": "Filter by user status"
    },
    "department": {
      "type": "string",
      "description": "Filter by department"
    },
    "sort_by": {
      "type": "string",
      "enum": ["name", "email", "role", "created_at", "last_login_at"],
      "default": "name"
    },
    "sort_direction": {
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "asc"
    },
    "include_inactive": {
      "type": "boolean",
      "default": false,
      "description": "Include inactive users in results"
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
    "users": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/User"
      }
    },
    "pagination": {
      "$ref": "#/components/schemas/PaginationMeta"
    },
    "statistics": {
      "total_users": 25,
      "active_users": 22,
      "by_role": {
        "manager": 3,
        "inventory_staff": 8,
        "warehouse": 14
      }
    }
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### POST `/users` - Create User

#### Purpose
Create new user account with role assignment and initial permissions.

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["name", "email", "role", "password"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 255,
      "description": "Full name of the user"
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255,
      "description": "Unique email address"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "maxLength": 255,
      "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
      "description": "Password must contain uppercase, lowercase, number, and special character"
    },
    "password_confirmation": {
      "type": "string",
      "description": "Must match password field"
    },
    "role": {
      "type": "string",
      "enum": ["warehouse", "inventory_staff", "manager"],
      "description": "User role determines permissions"
    },
    "phone": {
      "type": "string",
      "maxLength": 20,
      "nullable": true,
      "pattern": "^[+]?[0-9\\s\\-()]+$"
    },
    "department": {
      "type": "string",
      "maxLength": 100,
      "nullable": true,
      "enum": ["Operations", "Inventory", "Management", "Warehouse", "Procurement"]
    },
    "employee_id": {
      "type": "string",
      "maxLength": 50,
      "nullable": true,
      "description": "Internal employee identifier"
    },
    "hire_date": {
      "type": "string",
      "format": "date",
      "nullable": true
    },
    "supervisor_id": {
      "type": "integer",
      "nullable": true,
      "description": "Reference to supervisor user"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "Account active status"
    },
    "send_welcome_email": {
      "type": "boolean",
      "default": true,
      "description": "Send welcome email with login credentials"
    },
    "force_password_change": {
      "type": "boolean",
      "default": true,
      "description": "Require password change on first login"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Additional permissions beyond role defaults"
    },
    "notes": {
      "type": "string",
      "maxLength": 500,
      "nullable": true,
      "description": "Internal notes about the user"
    }
  }
}
```

#### Response Contract

##### Success Response (201)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "$ref": "#/components/schemas/User"
    },
    "temporary_password": {
      "type": "string",
      "description": "Generated password (only shown once)"
    },
    "welcome_email_sent": {
      "type": "boolean"
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
    "email": ["The email has already been taken."],
    "password": ["The password must contain at least one uppercase letter."],
    "role": ["The selected role is invalid."]
  },
  "timestamp": "2024-01-15T10:05:00Z"
}
```

#### Business Rules
1. **Email Uniqueness**: Email addresses must be unique across all users
2. **Role Hierarchy**: Only managers can create other manager accounts
3. **Password Security**: Passwords must meet complexity requirements
4. **Default Permissions**: Role-based permissions automatically assigned
5. **Account Activation**: New accounts can be created as pending activation
6. **Audit Trail**: All user creation events logged with creator information

---

### GET `/users/{id}` - Get User Details

#### Purpose
Retrieve detailed information about a specific user.

#### Request Contract

##### Authorization
- **Required Role**: `manager` (full access) or self (limited access)

#### Response Contract

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "$ref": "#/components/schemas/UserDetail"
    },
    "activity_summary": {
      "last_login": "2024-01-14T15:30:00Z",
      "login_count_30d": 28,
      "last_action": "Stock transaction recorded",
      "last_action_at": "2024-01-15T09:45:00Z"
    },
    "permissions": {
      "effective_permissions": [
        "inventory.view", "inventory.create", "inventory.edit"
      ],
      "role_permissions": [
        "inventory.view", "inventory.create"
      ],
      "additional_permissions": [
        "inventory.edit"
      ]
    }
  }
}
```

### PATCH `/users/{id}` - Update User

#### Purpose
Update user information, role, or status.

#### Request Contract

##### Authorization
- **Required Role**: `manager` (full update) or self (limited fields)

##### Request Body Schema
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 255
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255
    },
    "phone": {
      "type": "string",
      "maxLength": 20,
      "nullable": true
    },
    "department": {
      "type": "string",
      "maxLength": 100,
      "nullable": true
    },
    "role": {
      "type": "string",
      "enum": ["warehouse", "inventory_staff", "manager"],
      "description": "Manager-only field"
    },
    "is_active": {
      "type": "boolean",
      "description": "Manager-only field"
    },
    "supervisor_id": {
      "type": "integer",
      "nullable": true,
      "description": "Manager-only field"
    },
    "permissions": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Manager-only field"
    },
    "notes": {
      "type": "string",
      "maxLength": 500,
      "nullable": true,
      "description": "Manager-only field"
    }
  }
}
```

#### Business Rules
1. **Self-Update Limits**: Users can only update their own name, email, phone
2. **Role Changes**: Only managers can change user roles
3. **Permission Updates**: Managers can grant additional permissions within their scope
4. **Status Changes**: Deactivating users requires manager approval
5. **Email Changes**: Email changes require email verification

---

### DELETE `/users/{id}` - Deactivate User

#### Purpose
Deactivate user account (soft delete with audit trail).

#### Request Contract

##### Authorization
- **Required Role**: `manager`

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["reason"],
  "properties": {
    "reason": {
      "type": "string",
      "enum": ["resignation", "termination", "transfer", "inactive"],
      "description": "Reason for deactivation"
    },
    "effective_date": {
      "type": "string",
      "format": "date",
      "description": "When deactivation takes effect"
    },
    "notes": {
      "type": "string",
      "maxLength": 500,
      "nullable": true
    },
    "revoke_tokens": {
      "type": "boolean",
      "default": true,
      "description": "Immediately revoke all user tokens"
    },
    "transfer_data_to": {
      "type": "integer",
      "nullable": true,
      "description": "User ID to transfer ownership of records"
    }
  }
}
```

#### Business Rules
1. **Soft Delete**: Users are deactivated, not permanently deleted
2. **Data Integrity**: Associated records remain but are marked as historical
3. **Token Revocation**: All active sessions immediately terminated
4. **Audit Requirements**: Complete audit trail of deactivation maintained
5. **Manager Protection**: Cannot deactivate the last active manager

---

## Profile Management

### GET `/profile` - Get Current User Profile

#### Purpose
Retrieve authenticated user's own profile information.

#### Request Contract

##### Authorization
- **Required**: Valid authentication token

#### Response Contract

##### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "$ref": "#/components/schemas/UserProfile"
    },
    "preferences": {
      "$ref": "#/components/schemas/UserPreferences"
    },
    "session_info": {
      "login_count": 127,
      "last_login": "2024-01-14T15:30:00Z",
      "current_session_duration": "02:45:30",
      "devices_count": 2
    }
  }
}
```

### PATCH `/profile` - Update Profile

#### Purpose
Allow users to update their own profile information.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 255
    },
    "phone": {
      "type": "string",
      "maxLength": 20,
      "nullable": true
    },
    "preferences": {
      "type": "object",
      "properties": {
        "language": {
          "type": "string",
          "enum": ["en", "tl"],
          "default": "en"
        },
        "timezone": {
          "type": "string",
          "default": "Asia/Manila"
        },
        "theme": {
          "type": "string",
          "enum": ["light", "dark", "auto"],
          "default": "light"
        },
        "notifications": {
          "type": "object",
          "properties": {
            "email_alerts": {"type": "boolean", "default": true},
            "low_stock_alerts": {"type": "boolean", "default": true},
            "expiry_warnings": {"type": "boolean", "default": true}
          }
        }
      }
    }
  }
}
```

### POST `/profile/change-password` - Change Password

#### Purpose
Allow users to change their password.

#### Request Contract

##### Request Body Schema
```json
{
  "type": "object",
  "required": ["current_password", "new_password", "new_password_confirmation"],
  "properties": {
    "current_password": {
      "type": "string",
      "description": "Current password for verification"
    },
    "new_password": {
      "type": "string",
      "minLength": 8,
      "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]"
    },
    "new_password_confirmation": {
      "type": "string",
      "description": "Must match new_password"
    },
    "logout_other_sessions": {
      "type": "boolean",
      "default": true,
      "description": "Revoke tokens from other devices"
    }
  }
}
```

#### Business Rules
1. **Current Password Verification**: Must provide correct current password
2. **Password Policy**: Same complexity requirements as initial password
3. **Session Management**: Option to logout other active sessions
4. **Password History**: Cannot reuse last 5 passwords
5. **Forced Changes**: System can force password changes on next login

---

## Activity & Audit

### GET `/users/{id}/activity` - User Activity Log

#### Purpose
Retrieve user activity history for audit purposes.

#### Request Contract

##### Authorization
- **Required Role**: `manager` (any user) or self (own activity)

##### Query Parameters
```json
{
  "type": "object",
  "properties": {
    "start_date": {
      "type": "string",
      "format": "date"
    },
    "end_date": {
      "type": "string",
      "format": "date"
    },
    "activity_type": {
      "type": "string",
      "enum": ["login", "logout", "create", "update", "delete", "view"]
    },
    "resource_type": {
      "type": "string",
      "enum": ["product", "batch", "stock_transaction", "purchase_order", "user"]
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
    "activities": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ActivityLog"
      }
    },
    "summary": {
      "total_activities": 156,
      "most_active_day": "2024-01-10",
      "common_actions": [
        {"action": "stock_transaction", "count": 45},
        {"action": "product_view", "count": 32}
      ]
    }
  }
}
```

---

## Component Schemas

### User Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "email": {"type": "string"},
    "role": {
      "type": "string",
      "enum": ["warehouse", "inventory_staff", "manager"]
    },
    "role_display": {"type": "string"},
    "department": {"type": "string", "nullable": true},
    "employee_id": {"type": "string", "nullable": true},
    "phone": {"type": "string", "nullable": true},
    "is_active": {"type": "boolean"},
    "last_login_at": {"type": "string", "format": "date-time", "nullable": true},
    "created_at": {"type": "string", "format": "date-time"},
    "supervisor": {
      "type": "object",
      "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"}
      },
      "nullable": true
    }
  }
}
```

### UserDetail Schema
```json
{
  "type": "object",
  "allOf": [
    {"$ref": "#/components/schemas/User"},
    {
      "type": "object",
      "properties": {
        "hire_date": {"type": "string", "format": "date", "nullable": true},
        "email_verified_at": {"type": "string", "format": "date-time", "nullable": true},
        "two_factor_enabled": {"type": "boolean"},
        "login_count": {"type": "integer"},
        "notes": {"type": "string", "nullable": true},
        "permissions": {
          "type": "array",
          "items": {"type": "string"}
        },
        "devices": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "device_name": {"type": "string"},
              "last_used": {"type": "string", "format": "date-time"},
              "ip_address": {"type": "string"}
            }
          }
        }
      }
    }
  ]
}
```

### UserProfile Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "name": {"type": "string"},
    "email": {"type": "string"},
    "phone": {"type": "string", "nullable": true},
    "role": {"type": "string"},
    "role_display": {"type": "string"},
    "department": {"type": "string", "nullable": true},
    "avatar_url": {"type": "string", "nullable": true},
    "initials": {"type": "string"},
    "display_name": {"type": "string"}
  }
}
```

### UserPreferences Schema
```json
{
  "type": "object",
  "properties": {
    "language": {"type": "string", "default": "en"},
    "timezone": {"type": "string", "default": "Asia/Manila"},
    "theme": {"type": "string", "enum": ["light", "dark", "auto"]},
    "date_format": {"type": "string", "default": "MM/dd/yyyy"},
    "time_format": {"type": "string", "default": "12h"},
    "notifications": {
      "type": "object",
      "properties": {
        "email_alerts": {"type": "boolean"},
        "low_stock_alerts": {"type": "boolean"},
        "expiry_warnings": {"type": "boolean"},
        "po_approvals": {"type": "boolean"}
      }
    },
    "dashboard_widgets": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

### ActivityLog Schema
```json
{
  "type": "object",
  "properties": {
    "id": {"type": "integer"},
    "user_id": {"type": "integer"},
    "activity_type": {"type": "string"},
    "resource_type": {"type": "string", "nullable": true},
    "resource_id": {"type": "integer", "nullable": true},
    "description": {"type": "string"},
    "properties": {"type": "object"},
    "ip_address": {"type": "string"},
    "user_agent": {"type": "string"},
    "created_at": {"type": "string", "format": "date-time"}
  }
}
```

## Security & Compliance

### Role-Based Access Control

#### Permission Hierarchy
```json
{
  "manager": {
    "inherits": ["inventory_staff"],
    "additional": [
      "users.manage", "reports.view", "procurement.approve",
      "system.configure", "audit.view"
    ]
  },
  "inventory_staff": {
    "inherits": ["warehouse"],
    "additional": [
      "inventory.edit", "products.manage", "batches.edit",
      "procurement.create", "reports.basic"
    ]
  },
  "warehouse": {
    "base": [
      "inventory.view", "stock.receive", "stock.issue",
      "counts.submit", "discrepancies.report"
    ]
  }
}
```

### Audit Requirements
1. **User Actions**: All user management actions logged
2. **Login Events**: All authentication attempts recorded
3. **Permission Changes**: Role and permission changes tracked
4. **Data Access**: Sensitive data access logged
5. **Retention**: Activity logs retained for 2 years

### Security Features
1. **Password Policy**: Enforced complexity requirements
2. **Session Management**: Configurable session timeouts
3. **Multi-Device**: Track and manage multiple device sessions
4. **Failed Login Protection**: Account lockout after failed attempts
5. **Two-Factor Authentication**: Optional 2FA for enhanced security