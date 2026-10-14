# Dashboard stats endpoint and frontend integration

This change replaces hardcoded mock statistics with real database queries in the inventory dashboard. The backend now computes four metrics (total products, low stock count, inventory value, system accuracy) from products, batches, and physical counts tables. The frontend fetches these on mount and renders them in stat cards.

**Watch for:** Total inventory value query loads every batch with its product relation into memory (confirmed). Low stock comparison uses `whereColumn` correctly. System accuracy defaults to 100.0 when no counts exist, which matches "assume perfect until proven otherwise" intent (confirmed). Frontend gracefully handles loading and error states.

**Verdict:** APPROVED

---

## High-level view

The backend endpoint lives at `/api/v1/inventory/dashboard/stats` and is protected by `auth:sanctum` with `product.read` authorization. It computes total active products as a simple count, low stock items as a `whereColumn` comparison, total inventory value by loading all non-empty batches into memory and summing quantity × unit_cost, and system accuracy as the average accuracy_percentage from physical counts in the last 30 days.

The frontend replaced the `mockStats` array with a `useEffect` hook that calls `apiClient.get`, maps the response to stat card objects, and handles loading/error states. The four stat cards (Total Products, Low Stock Items, Inventory Value, System Accuracy) now display live data. Loading state shows skeleton cards; error state shows a message. The StatCard component and visual design are unchanged.

The total inventory value query uses eager loading (`.with('product')`) and iterates the collection in memory. For the current scale (hundreds of batches) this is acceptable. At thousands of batches, a database-level sum with a join would be faster.

---

<details>
<summary>Details</summary>

## Total inventory value in-memory aggregation

The backend computes total inventory value by loading all batches with `quantity > 0` into memory, eager-loading their products, and summing `quantity * unit_cost` in a collection closure:

```php
$totalInventoryValue = Batch::where('quantity', '>', 0)
    ->with('product')
    ->get()
    ->sum(function ($batch) {
        $unitCost = $batch->unit_cost ?? $batch->product->unit_price;
        return $batch->quantity * $unitCost;
    });
```

The closure accesses `$batch->product->unit_price` when `unit_cost` is null. The eager load (`.with('product')`) prevents N+1 queries, but the entire result set is pulled into memory and iterated in PHP. For hundreds of batches this is acceptable. At thousands of batches, a raw SQL aggregate would be faster and use less memory:

```sql
SELECT SUM(batches.quantity * COALESCE(batches.unit_cost, products.unit_price))
FROM batches
LEFT JOIN products ON batches.product_id = products.id
WHERE batches.quantity > 0
```

The current approach is simple and correct; optimization can wait until scale demands it.

</details>

---

<details>
<summary>File map</summary>

**Backend**
- `app/Modules/Inventory/Controllers/DashboardController.php` — new controller with `stats()` method that computes four metrics
- `app/Modules/Inventory/Routes/api.php` — added route `GET /dashboard/stats` pointing to `DashboardController@stats`, imports the controller

**Frontend**
- `resources/js/pages/dashboard/components/DashboardStats.jsx` — removed `mockStats` array, added `useEffect` hook to fetch from API, added loading/error state handling

Full diff: `git show 2bf331b`

</details>
