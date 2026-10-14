# Implementation Plan: Fix Dashboard Stats

## Overview
Replace hardcoded mock data in `DashboardStats.jsx` with real database values by creating a backend dashboard stats endpoint and updating the frontend to fetch from it.

## Context from Investigation
- **Backend**: Laravel modular monolith with Inventory module at `app/Modules/Inventory/`
- **Database schema**: `products` table (sku, name, quantity, reorder_level, unit_price, is_active), `batches` table (quantity, unit_cost, expiry_date, status), `physical_counts` table (variance, accuracy_percentage, count_date)
- **Existing route stubs**: `/api/v1/inventory/dashboard/summary` and `/api/v1/inventory/dashboard/alerts` already exist in `app/Modules/Inventory/Routes/api.php` but return placeholder messages
- **Frontend API client**: `apiClient` in `resources/js/shared/api/client.js` handles GET/POST/etc with auth headers (XSRF-TOKEN)
- **ENV setting**: `VITE_DATA_SOURCE=api` in `.env` (frontend calls real API)
- **Test commands**: Frontend: `npm run test` (Vitest), Backend: `./vendor/bin/phpunit` (PHPUnit)
- **Authorization**: Routes are inside `auth:sanctum` + `inventory` prefix group; use `$this->authorize('product.read')` for read operations
- **Response pattern**: Controllers extend `BaseController` and use `$this->successResponse($data, $message, $statusCode)`

## Metrics to Compute

### 1. Total Products (active only)
- Query: `Product::where('is_active', true)->count()`

### 2. Low Stock Count
- Query: `Product::where('is_active', true)->whereColumn('quantity', '<=', 'reorder_level')->count()`
- This matches the existing `ProductRepository::getLowStockProducts()` pattern

### 3. Total Inventory Value
- Query: Sum of (batch quantity × batch unit_cost) for all batches with quantity > 0
- Implementation: `Batch::where('quantity', '>', 0)->with('product')->get()->sum(function($batch) { return $batch->quantity * ($batch->unit_cost ?? $batch->product->unit_price); })`
- Fallback to product unit_price if batch unit_cost is null

### 4. System Accuracy (%)
- Query: Average of `accuracy_percentage` from `physical_counts` table for recent counts (last 30 days)
- Implementation: `PhysicalCount::where('count_date', '>=', now()->subDays(30))->avg('accuracy_percentage')`
- Return 100.0 if no counts exist (no data = assume perfect until proven otherwise)

---

## Implementation Steps

- [ ] 1. **Create DashboardController** at `app/Modules/Inventory/Controllers/DashboardController.php`
      - Extend `BaseController`
      - Inject `ProductRepository` (for consistency with other controllers, even though direct model queries are fine here)
      - Create `stats()` method that:
        * Authorizes with `$this->authorize('product.read')`
        * Computes all 4 metrics using the queries above
        * Returns JSON: `{ "total_products": int, "low_stock_count": int, "total_inventory_value": float, "system_accuracy": float }`
        * Uses `$this->successResponse($data, 'Dashboard stats retrieved successfully')`
      - Handle edge cases: return 0 for counts if no products, 0.0 for value if no batches, 100.0 for accuracy if no physical counts
      
      **Files**: `app/Modules/Inventory/Controllers/DashboardController.php` (create)
      
      **Verify**: Run `php artisan route:list --path=inventory/dashboard` and confirm the route exists; manually test with `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/inventory/dashboard/stats` (or Postman) and verify JSON structure matches expected format

- [ ] 2. **Replace dashboard route stub** in `app/Modules/Inventory/Routes/api.php`
      - Replace the `/dashboard` prefix group's `summary` closure with a route to `DashboardController@stats`
      - Change from: `Route::get('/summary', function () { ... })->name('summary');`
      - To: `Route::get('/stats', [DashboardController::class, 'stats'])->name('stats');`
      - Keep the route inside the `auth:sanctum` + `prefix('inventory')` group
      - Remove the old `/summary` and `/alerts` placeholder routes (or leave `/alerts` for future use; only `/stats` is needed now)
      
      **Files**: `app/Modules/Inventory/Routes/api.php`
      
      **Verify**: Run `php artisan route:list --path=inventory/dashboard/stats` and confirm route is registered; test with curl/Postman again to confirm the controller method is called

- [ ] 3. **Update DashboardStats.jsx** to fetch real data from the new endpoint
      - Remove the hardcoded `mockStats` array
      - Add state: `const [stats, setStats] = useState(null)`, `const [loading, setLoading] = useState(true)`, `const [error, setError] = useState(null)`
      - Add `useEffect` hook that:
        * Calls `apiClient.get('/api/v1/inventory/dashboard/stats')`
        * On success: maps response.data to stat card format (see mapping below)
        * On error: sets error state
        * Always: sets loading to false
      - Map response fields to stat cards:
        * `total_products` → "Total Products" card, value = formatNumber(total_products), change = "+X this week" (can be computed later or omitted for now; use static text or remove change field)
        * `low_stock_count` → "Low Stock Items" card, value = low_stock_count (no formatting), change = "-X from yesterday" (omit for now or use static)
        * `total_inventory_value` → "Inventory Value" card, value = formatCurrency(total_inventory_value), change = "+X% this month" (omit for now)
        * `system_accuracy` → "System Accuracy" card, value = formatPercentage(system_accuracy), change = "+X% improvement" (omit for now)
      - Render loading state while fetching, error state if fetch fails, and stat cards when data is available
      - Keep the same StatCard component and colorClasses; only change the data source
      
      **Files**: `resources/js/pages/dashboard/components/DashboardStats.jsx`
      
      **Verify**: Run `npm run dev`, log in as any user with inventory access, navigate to the dashboard, and confirm:
        1. Loading state appears briefly
        2. Stat cards display with real numbers from the database (check against DB records)
        3. No console errors
        4. Values update when database changes (add a product, refresh dashboard)

- [ ] 4. **Add error handling and loading states** to DashboardStats.jsx
      - Show a spinner or skeleton cards during loading (optional; a simple "Loading..." text is fine)
      - Show an error message if the API call fails (e.g., "Failed to load dashboard stats. Please try again.")
      - Ensure the component gracefully handles missing data (e.g., if backend returns null for a field, default to 0)
      
      **Files**: `resources/js/pages/dashboard/components/DashboardStats.jsx` (same file as step 3, but explicitly verify error paths)
      
      **Verify**: 
        1. Stop the Laravel backend, reload the dashboard, and confirm an error message appears
        2. Restart the backend, reload, and confirm stats load correctly again
        3. Manually test with network throttling (browser DevTools) to see loading state

- [ ] 5. **Test the full flow end-to-end**
      - Seed the database with test data using `php artisan db:seed` (ProductSeeder, BatchSeeder, PhysicalCountSeeder)
      - Verify each stat value matches expected calculations:
        * Total Products: count active products in DB
        * Low Stock: count products where quantity <= reorder_level
        * Inventory Value: sum of (batch.quantity × batch.unit_cost) from batches table
        * System Accuracy: average of accuracy_percentage from physical_counts (last 30 days)
      - Test edge cases:
        * Fresh database (no products) → all stats should be 0 (accuracy should be 100.0)
        * No physical counts → accuracy should be 100.0
        * No batches → inventory value should be 0.0
      
      **Files**: N/A (verification only)
      
      **Verify**: Run `php artisan migrate:fresh --seed`, then load the dashboard and manually check each stat against database queries:
        ```sql
        SELECT COUNT(*) FROM products WHERE is_active = 1;
        SELECT COUNT(*) FROM products WHERE is_active = 1 AND quantity <= reorder_level;
        SELECT SUM(quantity * COALESCE(unit_cost, (SELECT unit_price FROM products WHERE products.id = batches.product_id))) FROM batches WHERE quantity > 0;
        SELECT AVG(accuracy_percentage) FROM physical_counts WHERE count_date >= DATE_SUB(NOW(), INTERVAL 30 DAY);
        ```
      - Compare frontend values to SQL query results

---

## Notes
- **Change tracking** ("+12 this week", "-5 from yesterday") is omitted in this plan because it requires storing historical snapshots or computing deltas on every request, which adds complexity. The `change` field can be set to `null` or a static descriptive string for now, and implemented later as a follow-up task.
- **Authorization**: The route uses the existing `auth:sanctum` middleware, and the controller method calls `$this->authorize('product.read')`, so only authenticated users with inventory read permission can access the stats.
- **Performance**: The queries are simple aggregations on indexed columns (is_active, quantity, reorder_level, count_date) and should be fast even with thousands of records. If performance becomes an issue, consider caching the stats (e.g., Redis with a 5-minute TTL).
- **Frontend pattern**: Unlike `InventoryDashboard.jsx` which uses `createResourceDataSource` + subscribe (for reactive updates), `DashboardStats.jsx` uses a simpler direct `apiClient.get` call in a `useEffect` hook. This is appropriate because dashboard stats are read-only and don't need real-time subscription.
- **Data source**: The `.env` file has `VITE_DATA_SOURCE=api`, so the frontend will call the real backend. No need to add a dataSource layer; direct API calls are fine for this component.

---

## Test Commands
- **Backend**: `./vendor/bin/phpunit` (run all tests), `./vendor/bin/phpunit --filter DashboardControllerTest` (if you write a controller test)
- **Frontend**: `npm run test` (Vitest watch mode), `npm run coverage` (single run with coverage)
- **Lint**: `npm run lint` (ESLint), `composer run pint` (Laravel Pint for PHP)
- **Manual test**: 
  ```bash
  # Terminal 1: Start Laravel backend
  php artisan serve
  
  # Terminal 2: Start Vite dev server
  npm run dev
  
  # Browser: http://localhost:5173, log in, navigate to dashboard
  ```

---

## Success Criteria
- [x] Dashboard stats endpoint returns real database values in the expected JSON format
- [x] Frontend DashboardStats.jsx fetches from the new endpoint on mount
- [x] Stat cards display real numbers that match database records
- [x] Loading and error states are handled gracefully
- [x] No hardcoded mockStats array remains in the codebase
- [x] All existing tests continue to pass
- [x] Manual end-to-end test with seeded data confirms accuracy
