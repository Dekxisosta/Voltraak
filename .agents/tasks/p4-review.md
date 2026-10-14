# P4 Frontend Implementation Review

**Verdict**: CHANGES_REQUESTED

Critical frontend integration fixes for Laravel + Inertia.js + React stack. The implementation addresses authentication, permissions, layout persistence, performance optimization, and workflow completion, but several API adapters remain unimplemented which would prevent API mode from functioning correctly.

**Watch for:** Most inventory and manager pages still have API adapters as TODO comments (T33), which means switching to `VITE_DATA_SOURCE=api` would break these features. Otherwise, the core authentication, permissions, and picking workflow implementations are solid.

## High-level view

The API client correctly switches from Bearer tokens to Laravel session cookies with proper CSRF handling and error routing. User permissions are now properly shared via Inertia props and consumed by the AuthContext, fixing the "always false" permission checks. The layout system migrates to Inertia's persistent pattern, preventing unnecessary remounts during navigation. Dashboard data uses lazy loading to defer expensive operations until needed. The picking workflow logic correctly enables completion buttons only when orders are in the right state and all items are picked. The mock store maintains consistency across related collections when stock operations occur.

<details>
<summary>Issues (4)</summary>

1. **API adapters incomplete** — Most inventory and manager pages still have `() => null // TODO: api.method()` stubs instead of real API calls, preventing API mode from working.
2. **Missing batch expiry handling** — The `markBatchExpired` API method exists but no frontend page calls it to handle expired inventory.
3. **Test-only auth wrapper** — InertiaAuthWrapper in main.jsx exists solely to provide AuthProvider inside Inertia context but could be simplified.
4. **Potential CSRF parsing issue** — The cookie parsing logic assumes cookies are properly formatted without validation for malformed values.

</details>

<details><summary>Details</summary>

## T29: Session Authentication and CSRF Protection

**confirmed** The API client properly implements Laravel session authentication. The `getCSRFToken()` method extracts `XSRF-TOKEN` from cookies and URL-decodes it, then adds `X-XSRF-TOKEN` headers for mutating requests (POST/PUT/PATCH/DELETE). Relative URLs are used consistently via `buildUrl()` which constructs URLs against `window.location.origin`. Error handling routes 401 responses to `/login`, preserves 422 validation errors with their `errors` object, and shows toast notifications for 500+ server errors.

The upload helper correctly includes CSRF tokens and avoids setting Content-Type for FormData to let the browser handle multipart boundaries. This implementation aligns with Laravel's standard session-based authentication pattern.

## T30: Inertia Permissions Integration  

**confirmed** The `HandleInertiaRequests` middleware now includes user permissions in the shared props structure. The `getUserPermissions()` method grants comprehensive permissions to admin/manager roles and provides role-specific subsets for inventory_staff and warehouse roles. The AuthContext correctly consumes `auth.permissions` from `usePage().props` and the `hasPermission()` method checks the permissions array while maintaining backward compatibility for admin/manager roles.

This fixes the previous "always false" permission behavior by providing actual permission data to the frontend components.

## T31: Persistent Layout Architecture

**confirmed** The main.jsx file implements Inertia's persistent layout pattern correctly. Layout assignment happens in the `resolve()` function where `PageComponent.layout` is set to a function that renders either `AuthLayout` or `AppShell` wrapped in `InertiaAuthWrapper`. This prevents layout components from remounting on navigation since Inertia preserves components with the same layout function.

The `InertiaAuthWrapper` provides `AuthProvider` within the Inertia context, ensuring `usePage()` is available when AuthContext initializes.

## T32: Dashboard Lazy Loading Implementation

**confirmed** The web.php routes use `Inertia::lazy()` to wrap expensive dashboard operations. The main dashboard route wraps the role-specific dashboard service calls in lazy callbacks, and the manager section route similarly wraps `getManagerDashboard()`. This defers data loading until the frontend specifically requests it, preventing upfront computation of all dashboard widgets.

The lazy loading pattern works correctly with Inertia's partial reload feature, allowing components to trigger data loads on demand.

## T33: API Adapter Implementation Gap

**likely** While the inventory API client provides comprehensive endpoint coverage (`getPickingList`, `fulfillCustomerOrder`, `getProducts`, etc.), most pages still use placeholder API adapters. The grep results show extensive `() => null // TODO: api.method()` patterns across inventory, manager, and admin pages. 

The picking page is a notable exception—it properly implements both mock and API paths using `fetchData()` with `inventoryApi.getPickingList()` and `inventoryApi.fulfillCustomerOrder()`. This pattern should be replicated across other resource pages to enable API mode functionality.

Without these adapters, switching to `VITE_DATA_SOURCE=api` would result in null data loads for most features.

## T34: Picking Workflow State Logic

**confirmed** The picking workflow implements correct state transitions and button logic. The "Complete" button appears only when `status === 'in_progress'` AND `row.items.every(item => item.picked)`, ensuring all items are marked before order completion. The "Start Picking" button shows for pending orders to initiate the workflow.

The `handleCompleteOrder` function properly calls `fulfillCustomerOrder` (both mock and API versions) and updates local state to reflect completion. The `handleMarkPicked` function correctly tracks individual item picking status and updates the task status to `in_progress` when items are picked.

## T35: Mock Store Consistency Management

**confirmed** The mock store implements comprehensive related collection updates through `updateRelatedStockCollections()`. When stock operations occur:

- `handleStockReceive`: Updates product quantities and creates stock transactions
- `handleOrderFulfill`: Updates multiple reservations for an order, decrements product stock, updates reservation status to 'fulfilled'
- `handleStockAdjust`: Handles positive/negative adjustments with proper stock transaction logging
- `handleDamageWriteoff`: Decrements stock and logs writeoff transactions

The `updateProductQuantity`, `updateReservationStatus`, and `createStockTransaction` helpers maintain consistency across the `inventory/item-update`, `inventory/reservations`, and `inventory/stock-in-out` collections. Changes persist to localStorage and trigger subscribed component updates via the notification system.

This ensures that stock operations in one part of the app (e.g., picking fulfillment) immediately reflect in other areas (e.g., product stock levels, reservation lists).

</details>

## File map

<details>
<summary>Files changed</summary>

- `resources/js/shared/api/client.js` - CSRF token authentication, relative URLs, error handling
- `app/Http/Middleware/HandleInertiaRequests.php` - User permissions in shared props
- `resources/js/shared/contexts/AuthContext.jsx` - Permission consumption from Inertia props
- `resources/js/main.jsx` - Persistent layout pattern with InertiaAuthWrapper
- `routes/web.php` - Lazy loading wrappers for dashboard data
- `resources/js/pages/warehouse/picking/PickingPage.jsx` - Correct workflow state logic and API integration
- `resources/js/shared/services/mockStore.js` - Related collection updates for stock operations
- `resources/js/shared/api/inventory.js` - Complete API client methods for inventory operations

</details>