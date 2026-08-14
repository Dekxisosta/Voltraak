# Authentication API Contracts

## Overview
The Authentication API provides secure JWT-based authentication with role-based access control for the Voltraak Inventory Management System.

## Base Configuration
- **Base URL**: `/api/auth`
- **Content Type**: `application/json`
- **Rate Limiting**: 5 requests per minute for login attempts

---

## POST `/auth/login` - User Authentication

### Purpose
Authenticate user credentials and return JWT token with user profile.

### Request Contract

#### Headers
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

#### Request Body Schema
```json
{
  "type": "object",
  "required": ["email", "password"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255,
      "description": "User's email address"
    },
    "password": {
      "type": "string",
      "minLength": 6,
      "maxLength": 255,
      "description": "User's password"
    },
    "remember": {
      "type": "boolean",
      "default": false,
      "description": "Extend session duration"
    }
  }
}
```

#### Example Request
```json
{
  "email": "manager@voltraak.com",
  "password": "manager123",
  "remember": true
}
```

### Response Contract

#### Success Response (200)
```json
{
  "type": "object",
  "required": ["success", "data", "timestamp"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string",
      "example": "Login successful"
    },
    "data": {
      "type": "object",
      "required": ["user", "token", "api_token", "expires_in"],
      "properties": {
        "user": {
          "$ref": "#/components/schemas/AuthUser"
        },
        "token": {
          "type": "string",
          "description": "JWT token for frontend display"
        },
        "api_token": {
          "type": "string",
          "description": "Sanctum token for API requests"
        },
        "expires_in": {
          "type": "integer",
          "description": "Token expiration in seconds"
        }
      }
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

#### Error Responses

**401 Unauthorized - Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": {
    "email": ["The provided credentials do not match our records."]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**401 Unauthorized - Inactive Account**
```json
{
  "success": false,
  "message": "Account is inactive",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**422 Validation Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 6 characters."]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**429 Rate Limited**
```json
{
  "success": false,
  "message": "Too many login attempts. Please try again in 60 seconds.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Business Rules
1. **Security**: Password must be hashed with bcrypt
2. **Rate Limiting**: 5 failed attempts per email per 5 minutes
3. **Audit Logging**: All login attempts (success/failure) must be logged
4. **Session Management**: Update `last_login_at` timestamp on successful login
5. **Token Generation**: JWT contains user ID, role, and permissions
6. **Remember Me**: Extends token expiration from 1 hour to 2 weeks

### Side Effects
- Updates `users.last_login_at` timestamp
- Creates new `personal_access_tokens` entry
- Logs authentication event to `activity_logs`
- Revokes existing tokens if user has exceeded max concurrent sessions (5)

---

## POST `/auth/logout` - User Logout

### Purpose
Invalidate current session and revoke access tokens.

### Request Contract

#### Headers
```json
{
  "Authorization": "Bearer {api_token}",
  "Content-Type": "application/json"
}
```

#### Request Body
No body required.

### Response Contract

#### Success Response (200)
```json
{
  "success": true,
  "message": "Logout successful",
  "data": [],
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Business Rules
1. **Token Revocation**: Immediately revoke the provided API token
2. **Audit Logging**: Log logout event with IP address
3. **Cleanup**: Remove expired tokens during logout process

### Side Effects
- Deletes current token from `personal_access_tokens`
- Logs logout event to `activity_logs`
- Triggers cleanup of expired tokens (housekeeping)

---

## GET `/auth/me` - Get Current User Profile

### Purpose
Retrieve authenticated user's profile and permissions.

### Request Contract

#### Headers
```json
{
  "Authorization": "Bearer {api_token}",
  "Accept": "application/json"
}
```

### Response Contract

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "$ref": "#/components/schemas/AuthUser"
  },
  "timestamp": "2024-01-15T10:40:00Z"
}
```

#### Error Response (401)
```json
{
  "success": false,
  "message": "Unauthenticated",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

### Business Rules
1. **Fresh Data**: Always return current user state from database
2. **Permissions**: Include computed permissions based on role hierarchy
3. **Cache Update**: Update cached user data after successful response

---

## POST `/auth/refresh` - Refresh JWT Token

### Purpose
Generate new JWT token using existing valid token.

### Request Contract

#### Headers
```json
{
  "Authorization": "Bearer {current_token}",
  "Content-Type": "application/json"
}
```

### Response Contract

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_string",
    "api_token": "new_sanctum_token_string", 
    "expires_in": 3600,
    "user": {
      "$ref": "#/components/schemas/AuthUser"
    }
  },
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### Business Rules
1. **Token Validation**: Current token must be valid and not expired
2. **New Token Generation**: Generate fresh tokens with updated expiration
3. **Old Token Cleanup**: Optionally revoke old token (configurable)
4. **User Validation**: Ensure user is still active and permissions haven't changed

---

## Components Schemas

### AuthUser Schema
```json
{
  "type": "object",
  "required": ["id", "name", "email", "role", "is_active"],
  "properties": {
    "id": {
      "type": "integer",
      "example": 1
    },
    "name": {
      "type": "string",
      "example": "John Manager"
    },
    "email": {
      "type": "string",
      "format": "email",
      "example": "manager@voltraak.com"
    },
    "role": {
      "type": "string",
      "enum": ["warehouse", "inventory_staff", "manager"],
      "example": "manager"
    },
    "role_display": {
      "type": "string",
      "example": "Manager"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "example": ["inventory.view", "inventory.edit", "users.manage"]
    },
    "is_active": {
      "type": "boolean",
      "example": true
    },
    "last_login_at": {
      "type": "string",
      "format": "date-time",
      "nullable": true
    },
    "email_verified_at": {
      "type": "string",
      "format": "date-time",
      "nullable": true
    },
    "phone": {
      "type": "string",
      "nullable": true,
      "example": "+1-555-0123"
    },
    "department": {
      "type": "string",
      "nullable": true,
      "example": "Operations"
    },
    "display_name": {
      "type": "string",
      "example": "John Manager"
    },
    "initials": {
      "type": "string",
      "example": "JM"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

## Security Considerations

### Authentication Security
1. **Password Security**: All passwords hashed with bcrypt (cost: 12)
2. **Token Security**: JWT signed with HS256, Sanctum tokens are random 64-character strings
3. **Rate Limiting**: Prevent brute force attacks with exponential backoff
4. **Session Security**: Tokens expire after 1 hour (configurable)
5. **IP Validation**: Log IP addresses for audit trail
6. **HTTPS Only**: All authentication endpoints must use HTTPS in production

### Authorization Hierarchy
```
Manager (Level 3)
├── Full access to all endpoints
├── Can manage users and view all data
└── Can approve purchase orders

Inventory Staff (Level 2)
├── Can manage inventory operations
├── Can create/edit products and batches
└── Cannot manage users or approve POs

Warehouse (Level 1)
├── Can perform physical operations
├── Can submit counts and discrepancies
└── Read-only access to most data
```

### Audit Requirements
All authentication events must be logged with:
- User ID (if available)
- Email attempted
- IP address
- User agent
- Timestamp
- Success/failure status
- Failure reason (if applicable)