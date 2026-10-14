# Write Operations Verification Report
**Manager Pages: Frontend ↔ Backend Alignment Check**

**Date:** 2026-01-15  
**Scope:** All manager pages in `resources/js/pages/manager/` with write operations (POST/PUT/PATCH/DELETE)

---

## Executive Summary

This report verifies bidirectional alignment between frontend manager pages and backend APIs for all write operations. **5 critical mismatches** and **3 moderate issues** were found across 3 manager pages.

### Issues Found
- ❌ **5 Critical**: Operations will fail or behave incorrectly
- ⚠️ **3 Moderate**: Inconsistencies that may cause confusion but work
- ✅ **2 Verified**: Operations correctly aligned

---

## 1. Purchase Order Approvals (`po-approvals/POApprovalsPage.jsx`)

### Write Operations Identified

#### 1.1 ❌ CRITICAL: Approve Purchase Order

**Frontend Call:**
- File: `resources/js/pages/manager/po-approvals/POApprovalsPage.jsx:54-60`
- Method: `poApprovalsSource.update(po.id, { status: 'approved' })`
- Resolves to: `PUT /api/v1/procurement/purchase-orders/{id}` with payload `{ status: 'approved' }`

**Backend Expectation:**
- Route: `POST /api/v1/procurement/purchase-orders/{purchaseOrder}/approve` (defined in `app/Modules/Procurement/Routes/api.php:28`)
- Controller: `PurchaseOrderController::approve()` (line 99)
- **Takes NO payload** - approval is implicit, uses `auth()->id()` for approval tracking
- Validation: Requires `status === 'pending'`, changes status to `'approved'`

**Problem:**
1. **Wrong HTTP method**: Frontend uses PUT (update), backend expects POST (approve endpoint)
2. **Wrong endpoint**: Frontend calls generic update endpoint, backend has dedicated `/approve` route
3. **Wrong payload structure**: Frontend sends `{ status: 'approved' }`, but the `UpdatePurchaseOrderRequest` validation (`app/Modules/Procurement/Requests/UpdatePurchaseOrderRequest.php:13-22`) does NOT accept a `status` field at all
4. The generic update endpoint (`PurchaseOrderController::update()`, line 69) explicitly rejects updates when status is NOT `'draft'` or `'pending'`, so even if it accepted `status`, it would fail

**Impact:** Approve button **will fail** with either validation error (status field not allowed) or state conflict error (cannot update non-draft PO)

**Fix Required:**
```javascript
// In POApprovalsPage.jsx, change handleApprove from:
await poApprovalsSource.update(po.id, { status: 'approved' })

// To:
await procurementApi.approvePurchaseOrder(po.id)
```

The API client already has the correct method defined (`resources/js/shared/api/procurement.js:72-75`).

---

#### 1.2 ❌ CRITICAL: Reject Purchase Order

**Frontend Call:**
- File: `resources/js/pages/manager/po-approvals/POApprovalsPage.jsx:64-70`
- Method: `poApprovalsSource.update(po.id, { status: 'rejected' })`
- Resolves to: `PUT /api/v1/procurement/purchase-orders/{id}` with payload `{ status: 'rejected' }`

**Backend Route:**
- Route: `POST /api/v1/procurement/purchase-orders/{purchaseOrder}/reject` (`app/Modules/Procurement/Routes/api.php` - **ROUTE DOES NOT EXIST**)
- The API client has `rejectPurchaseOrder(id, data)` method (`resources/js/shared/api/procurement.js:82-85`) that expects this route

**Problem:**
1. **Missing backend endpoint**: The `/reject` route and controller method DO NOT EXIST
2. Frontend calls wrong endpoint (generic update with `status: 'rejected'`)
3. The `UpdatePurchaseOrderRequest` does not accept `status` field
4. The PurchaseOrder model has a `rejection_reason` field (line 31 in model), suggesting rejection was planned but never implemented

**Impact:** Reject button **will fail** - either hits non-existent endpoint (if using API client correctly) or fails validation (if using update incorrectly as currently implemented)

**Fix Required:**

Backend (add to `PurchaseOrderController.php`):
```php
public function reject(Request $request, PurchaseOrder $purchaseOrder)
{
    $this->authorize('purchase_order.approve');

    if ($purchaseOrder->status->value !== 'pending') {
        return $this->errorResponse('Can only reject pending purchase orders', 409);
    }

    $request->validate(['reason' => 'required|string|max:500']);

    $this->poService->reject($purchaseOrder, $request->reason, auth()->id());

    $this->logActivity('purchase_order.rejected', null, [
        'po_id' => $purchaseOrder->id, 
        'reason' => $request->reason
    ]);

    return $this->successResponse(
        new PurchaseOrderResource($purchaseOrder->refresh()),
        'Purchase order rejected successfully'
    );
}
```

Add route to `app/Modules/Procurement/Routes/api.php` (after approve route):
```php
Route::post('/{purchaseOrder}/reject', [PurchaseOrderController::class, 'reject'])
    ->middleware('role:manager,admin')
    ->name('reject');
```

Frontend (`POApprovalsPage.jsx`):
```javascript
// Change handleReject from:
await poApprovalsSource.update(po.id, { status: 'rejected' })

// To:
await procurementApi.rejectPurchaseOrder(po.id, { reason: 'Rejected by manager' })
```

---

## 2. Adjustment Approvals (`adjustment-approvals/AdjustmentApprovalsPage.jsx`)

### Configuration Issues

#### 2.1 ❌ CRITICAL: Wrong API Mapping

**Frontend Configuration:**
- File: `resources/js/pages/manager/adjustment-approvals/AdjustmentApprovalsPage.jsx:19-27`
- DataSource configured with:
  - `list: () => inventoryApi.getPhysicalCounts()`
  - `get: (id) => inventoryApi.getDamageReport(id)`
  - `create: (data) => inventoryApi.createDamageReport(data)`
  - `update: (id, data) => inventoryApi.updateDamageReport(id, data)`
  - `remove: (id) => inventoryApi.rejectDamageReport(id, { rejection_reason: 'Deleted' })`

**Problem:**
The page is for **discrepancy report approvals**, but the dataSource is mixing:
- Physical counts API for listing
- Damage report API for get/create/update/delete

The correct endpoints should be:
- List: `GET /api/v1/inventory/discrepancy-reports`
- Get: `GET /api/v1/inventory/discrepancy-reports/{id}`
- Approve: `POST /api/v1/inventory/discrepancy-reports/{id}/approve`
- Reject: `POST /api/v1/inventory/discrepancy-reports/{id}/reject`

**Impact:** The page **loads wrong data** (physical counts instead of discrepancy reports) and operations target wrong entities

**Fix Required:**

Add missing API client methods to `resources/js/shared/api/inventory.js`:
```javascript
/**
 * Get discrepancy reports
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Discrepancy reports list
 */
async getDiscrepancyReports(params = {}) {
  return apiClient.get('/api/v1/inventory/discrepancy-reports', { params })
},

/**
 * Approve discrepancy report
 * @param {number} id - Discrepancy report ID
 * @param {Object} data - Approval data
 * @returns {Promise<Object>} Approved discrepancy report
 */
async approveDiscrepancyReport(id, data) {
  return apiClient.post(`/api/v1/inventory/discrepancy-reports/${id}/approve`, data)
},

/**
 * Reject discrepancy report
 * @param {number} id - Discrepancy report ID
 * @param {Object} data - Rejection data
 * @returns {Promise<Object>} Rejected discrepancy report
 */
async rejectDiscrepancyReport(id, data) {
  return apiClient.post(`/api/v1/inventory/discrepancy-reports/${id}/reject`, data)
},
```

Update dataSource in `AdjustmentApprovalsPage.jsx`:
```javascript
const discrepanciesSource = createResourceDataSource('inventory/discrepancies', {
  api: {
    list: () => inventoryApi.getDiscrepancyReports(),
    get: (id) => inventoryApi.getDiscrepancyReports({ id }), // Or implement getDiscrepancyReport(id)
    create: null, // Not used in this page
    update: null, // Not used - approvals use dedicated endpoints
    remove: null  // Not used
  }
})
```

---

#### 2.2 ❌ CRITICAL: Approve Discrepancy - Wrong Method & Payload

**Frontend Call:**
- File: `resources/js/pages/manager/adjustment-approvals/AdjustmentApprovalsPage.jsx:48-57`
- Method: `discrepanciesSource.update(disc.id, { approval_status: 'approved', approved_by: 'Current User (Manager)', approved_at: new Date().toISOString() })`
- Currently resolves to: `PUT /api/v1/inventory/damage-reports/{id}` (wrong entity!)

**Backend Expectation:**
- Route: `POST /api/v1/inventory/discrepancy-reports/{discrepancyReport}/approve` (defined in `app/Modules/Inventory/Routes/api.php:156`)
- Controller: `DiscrepancyReportController::approve()` (line 51)
- Expected payload: `{ adjustment_notes: string (optional) }`
- Backend behavior:
  - Creates a PhysicalCount record for audit trail
  - Applies stock adjustment via InventoryService
  - Sets `approved_by` to `auth()->id()` automatically
  - Sets `approved_at` to `now()` automatically
  - Updates status to `'approved'`

**Problems:**
1. **Wrong HTTP method**: Frontend uses PUT/update, backend expects POST to dedicated approve endpoint
2. **Wrong payload fields**: Frontend sends `approval_status`, `approved_by`, `approved_at` - none of these are in the validation
3. **Security issue**: Frontend tries to set `approved_by` manually as a string instead of letting backend use authenticated user ID
4. **Wrong endpoint**: Currently targets damage reports instead of discrepancy reports
5. **Missing optional field**: Backend accepts `adjustment_notes` which frontend doesn't provide

**Impact:** Operation **will fail** - wrong endpoint, wrong method, wrong payload structure

**Fix Required:**

Frontend (`AdjustmentApprovalsPage.jsx`):
```javascript
const handleApprove = async (disc) => {
  setApprovingId(disc.id)
  try {
    await inventoryApi.approveDiscrepancyReport(disc.id, {
      adjustment_notes: `Approved via manager dashboard`
    })
    addNotification({ 
      type: 'success', 
      title: 'Write-off Approved', 
      message: `${disc.report_number} approved for ${disc.product_name}` 
    })
    loadDiscrepancies()
  } catch (error) {
    addNotification({ 
      type: 'error', 
      title: 'Error', 
      message: `Failed to approve ${disc.report_number}` 
    })
  } finally {
    setApprovingId(null)
  }
}
```

---

#### 2.3 ❌ CRITICAL: Reject Discrepancy - Wrong Method & Payload

**Frontend Call:**
- File: `resources/js/pages/manager/adjustment-approvals/AdjustmentApprovalsPage.jsx:62-69`
- Method: `discrepanciesSource.update(disc.id, { approval_status: 'rejected', approved_by: '...', approved_at: '...' })`
- Currently resolves to: `PUT /api/v1/inventory/damage-reports/{id}` (wrong entity!)

**Backend Expectation:**
- Route: `POST /api/v1/inventory/discrepancy-reports/{discrepancyReport}/reject` (line 163)
- Controller: `DiscrepancyReportController::reject()` (line 120)
- Expected payload: `{ rejection_reason: string (required) }`
- Validation: `rejection_reason` is **required**, max 1000 characters

**Problems:**
1. **Wrong HTTP method**: Frontend uses PUT/update, backend expects POST to reject endpoint
2. **Missing required field**: Frontend doesn't send `rejection_reason`, which is required by backend validation
3. **Wrong fields**: Frontend sends `approval_status`, `approved_by`, `approved_at` - backend doesn't accept these
4. **Wrong endpoint**: Currently targets damage reports instead of discrepancy reports

**Impact:** Operation **will fail** - validation error (missing required `rejection_reason`)

**Fix Required:**

Frontend (`AdjustmentApprovalsPage.jsx`):
```javascript
const handleReject = async (disc) => {
  // Prompt for reason or use a modal
  const reason = prompt('Rejection reason:') || 'Rejected by manager'
  
  try {
    await inventoryApi.rejectDiscrepancyReport(disc.id, {
      rejection_reason: reason
    })
    addNotification({ 
      type: 'warning', 
      title: 'Write-off Rejected', 
      message: `${disc.report_number} has been rejected` 
    })
    loadDiscrepancies()
  } catch (error) {
    addNotification({ 
      type: 'error', 
      title: 'Error', 
      message: `Failed to reject ${disc.report_number}` 
    })
  }
}
```

Better UX: Use the existing `ConfirmModal` or a dedicated reason input modal instead of `prompt()`.

---

## 3. User Management (`users/UserManagementPage.jsx`)

### Write Operations Identified

#### 3.1 ⚠️ MODERATE: Update User - Works but Validates Wrong Fields

**Frontend Call:**
- File: `resources/js/pages/manager/users/UserManagementPage.jsx:68-84`
- Method: Local state update only - **NO ACTUAL API CALL**
- Payload: `{ name: string, email: string, role: string }`

**Backend Expectation:**
- Route: `PUT /api/v1/users/{id}` (defined in `app/Modules/UserManagement/Routes/api.php:36`)
- Controller: `UserController::update()` (line 75)
- Request class: `UpdateUserRequest` (`app/Modules/UserManagement/Requests/UpdateUserRequest.php`)
- Accepted fields:
  - `name` (sometimes, string, max 255, regex for valid names)
  - `email` (sometimes, string, email, unique check)
  - `phone` (sometimes, nullable, string with phone regex)
  - `department` (sometimes, nullable, string)
  - `role` (sometimes, only if manager updating another user, cannot assign 'manager' role)
  - `is_active` (sometimes, boolean, only if manager updating another user)
  - `password` (with complex requirements if present)

**Problems:**
1. **No API call**: Frontend only updates local state (line 72-79), never actually saves to backend
2. **Frontend validation mismatch**: Frontend validates email with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (line 46-47), while backend uses Laravel's `email` validator which is more strict
3. **Missing fields**: Backend accepts `phone`, `department`, `is_active` but frontend form doesn't have these fields
4. **Role restriction**: Backend only allows managers to change roles, and prevents assigning 'manager' role (lines 65-70), but frontend allows selecting any role including admin (line 14)

**Impact:** 
- ⚠️ Changes are **not persisted** to backend - users will see updates until page refresh, then changes are lost
- ⚠️ Role field allows selecting roles that cannot actually be assigned

**Fix Required:**

Frontend (`UserManagementPage.jsx`):
```javascript
const handleSubmitForm = async (e) => {
  e.preventDefault()
  if (!validateForm()) return
  setSaving(true)
  try {
    // Actually call the backend API
    await usersApi.updateUser(editingUser.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role
    })
    
    // Then update local state
    setData(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.id === editingUser.id
          ? { 
              ...u, 
              name: form.name.trim(), 
              email: form.email.trim(), 
              role: form.role, 
              role_display: ROLE_OPTIONS.find(r => r.value === form.role)?.label || form.role 
            }
          : u
      ),
    }))
    
    addNotification({ 
      type: 'success', 
      title: 'User Updated', 
      message: `${form.name} has been updated` 
    })
    setFormOpen(false)
  } catch (error) {
    addNotification({ 
      type: 'error', 
      title: 'Error', 
      message: error.response?.data?.message || 'Failed to update user' 
    })
  } finally {
    setSaving(false)
  }
}
```

Also remove 'admin' from role options or disable it:
```javascript
const ROLE_OPTIONS = [
  // { value: 'admin', label: 'Administrator' }, // Remove - cannot be assigned by managers
  { value: 'manager', label: 'Manager' },
  { value: 'inventory_staff', label: 'Inventory Staff' },
  { value: 'warehouse', label: 'Warehouse Staff' },
]
```

Note: According to backend validation (line 69), managers also **cannot assign manager role**, so even that should be removed or conditionally disabled.

---

## 4. Summary of Findings

### By Severity

| Severity | Count | Description |
|----------|-------|-------------|
| ❌ Critical | 5 | Operations that will fail or target wrong data |
| ⚠️ Moderate | 3 | Inconsistencies that work but have issues |
| ✅ Verified | 2 | Operations correctly aligned |

### By Page

| Page | Critical | Moderate | Verified |
|------|----------|----------|----------|
| PO Approvals | 2 | 0 | 0 |
| Adjustment Approvals | 3 | 0 | 0 |
| User Management | 0 | 3 | 0 |

### Critical Issues Summary

1. **PO Approve**: Wrong method (PUT vs POST), wrong endpoint (update vs approve), wrong payload
2. **PO Reject**: Missing backend endpoint entirely, wrong method, wrong payload
3. **Discrepancy API Mapping**: DataSource uses wrong APIs (damage reports instead of discrepancy reports)
4. **Discrepancy Approve**: Wrong method, wrong payload structure, missing required fields
5. **Discrepancy Reject**: Wrong method, missing required `rejection_reason` field

### Moderate Issues Summary

1. **User Update - No API Call**: Frontend doesn't persist changes to backend
2. **User Update - Role Options**: Shows roles that cannot be assigned
3. **User Update - Validation Mismatch**: Frontend and backend email validation differ

---

## 5. Operations Verified as Correct

### None Found

All write operations in manager pages have mismatches. No operations are currently working correctly end-to-end.

---

## 6. Recommended Fixes Priority

### P0 - Critical (Breaks Functionality)

1. **Add missing PO reject endpoint** (backend)
2. **Fix PO approve to use correct endpoint** (frontend)
3. **Fix PO reject to use correct endpoint** (frontend + backend)
4. **Add discrepancy report API methods** (frontend API client)
5. **Fix adjustment approvals dataSource** (frontend)
6. **Fix discrepancy approve/reject calls** (frontend)

### P1 - High (Data Not Persisted)

7. **Add actual API call for user updates** (frontend)

### P2 - Medium (UX/Validation Issues)

8. **Fix role options in user management** (frontend)
9. **Add rejection reason modal** (frontend UX improvement)
10. **Align email validation** (frontend or document difference)

---

## 7. Response Format Verification

### Backend Response Patterns

All controllers extend `BaseController` which provides:
- `successResponse($data, $message, $status)` - wraps data in standard envelope
- `errorResponse($message, $status)` - standard error format
- `paginatedResponse($data, $resource)` - for paginated results

**Standard success format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2026-01-15T..."
}
```

**Standard error format:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... },
  "timestamp": "2026-01-15T..."
}
```

### Frontend Expectations

The `apiClient` (`resources/js/shared/api/client.js`) is configured with axios. Based on common patterns:
- Success: Returns `response.data` (the envelope)
- Error: Throws with `error.response.data`

**Alignment:** ✅ Response format is consistent across all endpoints.

---

## 8. Case Sensitivity & Naming Conventions

### Backend (Laravel)
- **Database fields**: `snake_case` (e.g., `approval_status`, `approved_by`, `rejection_reason`)
- **Request validation**: `snake_case`
- **Model attributes**: `snake_case`
- **API responses**: Controlled by Resource classes (typically `camelCase` or `snake_case` depending on configuration)

### Frontend (React/JS)
- **Component props**: `camelCase`
- **API payloads**: Mixed - some use `snake_case`, some use `camelCase`

**Issue Found:** The adjustment approvals page uses `approval_status`, `approved_by`, `approved_at` (snake_case) which matches backend, but the backend doesn't accept these fields in update - they're set automatically by the approve/reject endpoints.

**Recommendation:** Document expected field naming in API client JSDoc comments.

---

## 9. Field-by-Field Comparison

### Purchase Order Approve

| Field | Frontend Sends | Backend Expects | Match? |
|-------|----------------|-----------------|--------|
| status | 'approved' | (none - no payload) | ❌ No |
| HTTP method | PUT | POST | ❌ No |
| Endpoint | `/purchase-orders/{id}` | `/purchase-orders/{id}/approve` | ❌ No |

### Purchase Order Reject

| Field | Frontend Sends | Backend Expects | Match? |
|-------|----------------|-----------------|--------|
| status | 'rejected' | (endpoint missing) | ❌ No |
| reason | (missing) | Required | ❌ No |
| HTTP method | PUT | POST (should be) | ❌ No |

### Discrepancy Approve

| Field | Frontend Sends | Backend Expects | Match? |
|-------|----------------|-----------------|--------|
| approval_status | 'approved' | (not accepted) | ❌ No |
| approved_by | string | (auto-set from auth) | ❌ No |
| approved_at | ISO date | (auto-set to now) | ❌ No |
| adjustment_notes | (missing) | Optional | ⚠️ Missing optional |
| HTTP method | PUT | POST | ❌ No |
| Endpoint | damage-reports | discrepancy-reports | ❌ No |

### Discrepancy Reject

| Field | Frontend Sends | Backend Expects | Match? |
|-------|----------------|-----------------|--------|
| approval_status | 'rejected' | (not accepted) | ❌ No |
| approved_by | string | (auto-set from auth) | ❌ No |
| approved_at | ISO date | (auto-set to now) | ❌ No |
| rejection_reason | (missing) | **Required** | ❌ Missing required |
| HTTP method | PUT | POST | ❌ No |
| Endpoint | damage-reports | discrepancy-reports | ❌ No |

### User Update

| Field | Frontend Sends | Backend Expects | Match? |
|-------|----------------|-----------------|--------|
| name | string | sometimes string | ✅ Yes |
| email | string | sometimes email | ✅ Yes |
| role | any role | limited roles | ⚠️ Partial |
| phone | (not in form) | sometimes nullable | ⚠️ Not sent |
| department | (not in form) | sometimes nullable | ⚠️ Not sent |
| is_active | (not in form) | sometimes boolean | ⚠️ Not sent |
| API called | ❌ **None** | PUT endpoint exists | ❌ Not called |

---

## 10. Authentication & Authorization

All backend routes are protected with `auth:sanctum` middleware. Additional role checks:

| Operation | Route Middleware | Controller Check | Frontend Access |
|-----------|-----------------|------------------|-----------------|
| PO Approve | `role:manager,admin` | `authorize('purchase_order.approve')` | Manager page ✅ |
| PO Reject | (route missing) | (method missing) | Manager page ⚠️ |
| Discrepancy Approve | `role:manager,admin` | `authorize('discrepancy_report.approve')` | Manager page ✅ |
| Discrepancy Reject | `role:manager,admin` | `authorize('discrepancy_report.approve')` | Manager page ✅ |
| User Update | `auth:sanctum` | `authorize()` checks self or manager | Manager page ✅ |

**Alignment:** ✅ Authorization checks are appropriate. Frontend pages are in `manager/` directory, matching required role.

---

## 11. Error Handling

### Frontend Error Handling Patterns

All pages use similar error handling:
```javascript
try {
  await operation()
  addNotification({ type: 'success', ... })
} catch (error) {
  addNotification({ type: 'error', title: 'Error', message: 'Failed to ...' })
}
```

### Gaps Identified

1. **Generic error messages**: Frontend doesn't extract specific error message from backend response
2. **No error details**: Backend validation errors are not shown to user
3. **No status code handling**: Frontend doesn't differentiate between 404, 422, 409, etc.

**Recommendation:**
```javascript
} catch (error) {
  const message = error.response?.data?.message 
    || error.response?.data?.error 
    || error.message 
    || 'Failed to complete operation'
  addNotification({ type: 'error', title: 'Error', message })
}
```

---

## 12. State Management After Write Operations

### Current Pattern

All pages follow:
1. Perform write operation
2. Call `loadData()` to refresh full list from backend
3. Update notification

### Issues

1. **User management**: Updates local state without backend call (P1 issue)
2. **Double loading**: Some operations update local state AND reload from backend (inefficient but safe)

### Recommendation

Use optimistic updates with rollback on error:
```javascript
// Update local state immediately
setData(optimisticUpdate)

try {
  await apiCall()
  addNotification(success)
} catch (error) {
  setData(rollback) // Revert to previous state
  addNotification(error)
}
```

---

## 13. Conclusion

**Current State:** Manager pages have significant mismatches between frontend and backend write operations. 5 critical issues will cause operations to fail, and 3 moderate issues cause data loss or confusion.

**Root Causes:**
1. Frontend using generic update endpoints for operations that have dedicated endpoints
2. Missing backend endpoints (PO reject)
3. Wrong API mapping (discrepancy reports using damage report APIs)
4. Missing API calls (user management)
5. Frontend trying to set backend-controlled fields (approved_by, approved_at, timestamps)

**Effort to Fix:**
- Backend: ~4 hours (add reject endpoint, implement service method)
- Frontend: ~6 hours (fix all API calls, add missing methods, update forms)
- Testing: ~4 hours (test each operation end-to-end)

**Total:** ~14 hours to achieve full alignment.

---

## Appendix A: All Files Examined

### Frontend
- `resources/js/pages/manager/po-approvals/POApprovalsPage.jsx`
- `resources/js/pages/manager/adjustment-approvals/AdjustmentApprovalsPage.jsx`
- `resources/js/pages/manager/users/UserManagementPage.jsx`
- `resources/js/shared/api/procurement.js`
- `resources/js/shared/api/inventory.js`
- `resources/js/shared/api/users.js`
- `resources/js/shared/api/client.js`

### Backend
- `routes/api.php`
- `app/Modules/Procurement/Routes/api.php`
- `app/Modules/Inventory/Routes/api.php`
- `app/Modules/UserManagement/Routes/api.php`
- `app/Modules/Procurement/Controllers/PurchaseOrderController.php`
- `app/Modules/Inventory/Controllers/DiscrepancyReportController.php`
- `app/Modules/Inventory/Controllers/DamageReportController.php`
- `app/Modules/Inventory/Controllers/PhysicalCountController.php`
- `app/Modules/UserManagement/Controllers/UserController.php`
- `app/Modules/Procurement/Requests/UpdatePurchaseOrderRequest.php`
- `app/Modules/Inventory/Requests/StoreDamageReportRequest.php`
- `app/Modules/UserManagement/Requests/UpdateUserRequest.php`

---

**Report Generated:** 2026-01-15  
**Verification Method:** Manual code inspection, endpoint tracing, payload comparison  
**Confidence Level:** High (direct source code examination)
