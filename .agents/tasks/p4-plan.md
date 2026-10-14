# P4 Frontend Implementation Plan - Critical Issues (T29-T35)

Based on investigation of the Voltraak IMS Laravel + Inertia.js + React codebase, this plan addresses the critical frontend integration issues blocking core functionality.

## Project Context

- **Stack**: Laravel backend + Inertia.js + React frontend
- **Build**: Vite build system, npm workspaces
- **Test**: Vitest test runner
- **Build command**: `npm run build`
- **Test command**: `npm run test` 
- **Data modes**: VITE_DATA_SOURCE toggles between "mocks" (default) and "api"

## Implementation Tasks (Ordered by Dependencies)

- [ ] 1. **T29 - Fix API client authentication (BLOCKS API MODE)**
      Replace Bearer token authentication with session/cookie authentication to work with Laravel's standard session handling.
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\shared\api\client.js`
      Changes:
      - Lines 18-22: Remove `getAuthToken()` method and Bearer token logic from `getHeaders()`
      - Lines 23-29: Add CSRF token header (`X-XSRF-TOKEN`) from cookie parsing
      - Lines 31-32: Replace hardcoded `baseURL` with relative URLs (remove `import.meta.env.VITE_API_BASE_URL` default)
      - Lines 46-51: Update 401 error handling to redirect to `/login` route instead of `/login` URL
      - Lines 53-57: Ensure 422 validation errors properly return the `errors` object
      - Lines 59-63: Add 500 error toast notification handling
      Verify: `npm run test` passes, API calls work in browser with Laravel sessions

- [ ] 2. **T30 - Include permissions in Inertia shared props (BLOCKS USER ACCESS)**
      Fix permissions always returning false by including user permissions in Inertia's shared props.
      Files: 
      - `c:\Users\nelxe\Downloads\voltraak-mock\app\Http\Middleware\HandleInertiaRequests.php`
      - `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\shared\contexts\AuthContext.jsx`
      Changes:
      - HandleInertiaRequests.php lines 32-38: Add permissions to the auth shared prop structure
      - AuthContext.jsx lines 9-11: Update to consume permissions from `auth.permissions` via `usePage().props`
      - AuthContext.jsx lines 26-28: Update `hasPermission()` logic to use the shared props permissions
      Verify: `npm run test` passes, permissions check correctly in browser dev tools

- [ ] 3. **T31 - Migrate to Inertia Page.layout pattern (POOR UX)**
      Stop layout remounting on navigation by using Inertia's persistent layout pattern instead of wrapping in resolve().
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\main.jsx`
      Changes:
      - Lines 29-44: Remove layout wrapping logic from `resolve()` function
      - Lines 24-26: Set up persistent layout resolver pattern using Inertia's layout system
      - Individual page files: Add `PageComponent.layout = Layout` static property to each page component
      Verify: Navigate between pages and confirm layouts don't remount (React DevTools should show layout persists)

- [ ] 4. **T32 - Add lazy loading to dashboard data (SLOW PERFORMANCE)**
      Wrap expensive dashboard data in `Inertia::lazy()` to prevent eager loading of all data.
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\routes\web.php`
      Changes:
      - Lines 55-65: Wrap `$dashboardService->getManagerDashboard()` calls in `Inertia::lazy()`
      - Lines 91-95: Wrap `$dashboardService->getManagerDashboard()` in manager route with lazy loading
      - Add conditional loading based on active tab or user interaction
      Verify: Dashboard page loads faster, network tab shows data loads on demand

- [ ] 5. **T33 - Add missing API adapters for data sources (BLOCKS FEATURES)**
      Complete the API adapter implementations in resource data sources that fall back to mocks.
      Files: Data source usage in pages (investigate during implementation for specific files)
      Changes:
      - Find `createResourceDataSource()` calls missing API adapters in inventory and warehouse pages
      - Add API client method calls to match the mock data patterns
      - Ensure proper error handling and data transformation
      Verify: Switch to `VITE_DATA_SOURCE=api` and confirm pages load real data instead of mocks

- [ ] 6. **T34 - Fix picking workflow button states (BLOCKS FULFILLMENT)**
      Correct the button enable/disable logic in the picking workflow to allow order completion.
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\pages\warehouse\picking\PickingPage.jsx`
      Changes:
      - Lines 153-160: Fix the "Complete" button condition - should be enabled when all items are picked AND status is 'in_progress'
      - Lines 111-125: Ensure `handleMarkPicked` correctly updates item state and task status
      - Lines 127-149: Verify `handleCompleteOrder` properly calls the fulfillment API
      Verify: `npm run test` passes, picking workflow completes orders correctly in browser

- [ ] 7. **T35 - Update related mock collections on stock operations (INCONSISTENT DATA)**
      Ensure mock stock operations update related in-memory collections like product quantities and reservations.
      Files: `c:\Users\nelxe\Downloads\voltraak-mock\resources\js\shared\services\mockStore.js` and related mock utilities
      Changes:
      - Extend mockStore mutation operations to update related collections
      - When stock is issued, update product quantity totals
      - When reservations change, update reservation lists in memory
      - Ensure mock operations maintain data consistency across related entities
      Verify: Perform stock operations in mock mode, confirm related data updates immediately across different pages/components

## Dependencies

Tasks 1-2 are prerequisites for API mode functionality. Task 3 improves UX but is independent. Task 4 improves performance and is independent. Tasks 5-7 build on the API client foundation from Task 1.

## Testing Strategy

Each task includes verification steps using the project's build and test commands:
- `npm run test` - Run unit tests to ensure no regressions
- `npm run build` - Verify the build succeeds
- Browser testing with both `VITE_DATA_SOURCE=mocks` and `VITE_DATA_SOURCE=api`
- Manual verification of user workflows (login, permissions, navigation, data loading)