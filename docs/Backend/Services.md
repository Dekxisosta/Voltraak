# Backend — Services (Core Business Logic)

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `../PRD.md`, `Project-Structure.md`, `../Database/Database.md`, `API.md`

This is the business-logic layer that doesn't belong to a single table or endpoint — the formulas
and algorithms behind the three problems the PRD targets. Each section maps 1:1 to a service class
in `backend/app/Modules/{Module}/Services/` (per the new modular file structure — see `Project-Structure.md`).

---

## 1. Reorder Point (ROP)

`App\Modules\Procurement\Services\ReorderPointCalculator`

```
ADU        = Total Units Sold (past 365 days) / 365
SF_m       = Average Demand for Month m / Overall Monthly Average Demand
D_seasonal = ADU × SF_m
SS         = (D_max × L_max) − (D_seasonal × L)
ROP        = (D_seasonal × L) + SS
```

- `L` = supplier lead time (days), `D_max` = max recorded daily demand, `L_max` = max supplier lead time.
- Non-seasonal products use `SF_m = 1` (flat demand) — the calculator checks `product->is_seasonal`
  and forces the seasonal factor to `1.0` when false.
- Both `safety_stock` and `reorder_point` are floored at `0` in the implementation (a formula that
  goes negative doesn't mean "reorder less than nothing").
- `needsReplenishment(currentStock, reorderPoint)` returns `true` when `current_stock < ROP` — this
  is the trigger `GET /reorder-points` uses to generate a `procurement_requests` row.

## 2. Inventory Variance / Shrinkage

`App\Modules\Inventory\Services\VarianceService`

```
Inventory Variance   = Recorded Stock − Physical Stock
Inventory Accuracy % = (Physical Stock / Recorded Stock) × 100
Shrinkage %           = (Missing Units / Recorded Stock) × 100
```

- Computed on every `physical_counts` submission (`POST /physical-counts`).
- Both percentages guard against `recordedStock == 0` (accuracy defaults to 100%, shrinkage to 0%
  rather than dividing by zero).
- `exceedsAlertThreshold(shrinkagePercent, threshold = 5.0)` — alert fires when shrinkage exceeds
  the configured threshold. Default is 5%, matching the PRD's shrinkage-rate target. **Open
  question:** whether this becomes per-category configurable (see `Architecture.md` §7).

## 3. FEFO / Expiry State Machine

`App\Modules\Inventory\Services\FEFOService`

```
t_remaining = expiry_date − current_date
```

| State | Condition | Behavior |
|---|---|---|
| Safe | t_remaining > 60 days | Standard picking sequence permitted |
| Warning | t_remaining ≤ 60 days | Flag routes workers to empty this batch first; eligible for clearance promo |
| Expired | t_remaining ≤ 0 days | Batch locked, removed from online stock allocation |

- `stateFor(batch)` returns one of `safe` / `warning` / `expired` from `remainingDays()`.
- `selectBatchForPick(availableBatches)` — used by `POST /stock-out`: filters out expired batches,
  sorts by `expiry_date` ascending, returns the earliest. This is what makes FEFO (not LIFO) the
  enforced picking order at the service layer, backed by `stock_transactions.batch_id` at the data
  layer (see `../Database/Database.md` §3).
- `pickOrder(availableBatches)` — same filter/sort, but returns the full ordered list with state and
  `t_remaining` per batch. Powers `GET /fefo-recommendations` and the FEFO Recommendations screen
  (`Frontend/Pages.md`).

## 4. Key Sequence Flows

1. **User Login:** SPA → `AuthController` → `AuthService.authenticate()` → `UserRepository.findUser()`
   → verify password → issue token → SPA redirects to role-based dashboard.
2. **Stock In:** SPA → `StockInController` → `StockInService` creates `batches` row → updates
   `products` stock → inserts `stock_transactions` row → confirms to SPA.
3. **FEFO Stock Out:** SPA → `StockOutController` → `FEFOService::selectBatchForPick()` → deducts
   quantity from the selected batch → updates batch → logs transaction against that `batch_id`.
4. **Reorder Point Check:** SPA → `ReorderController` → `ReorderPointCalculator::calculate()` →
   `needsReplenishment()` compares to current stock → inserts `procurement_requests` for anything
   below threshold → returns alert list.
5. **Expiry Alert:** SPA → `ExpiryController` → `FEFOService::pickOrder()` / `stateFor()` per batch
   → flags Warning/Expired → returns alert list.

## 5. Adding a New Service

Keep the same shape as the three above: a stateless class under
`backend/app/Modules/{Module}/Services/`, doc comment linking back to the relevant section of this file,
pure calculation methods (no direct DB writes inside the formula method — let the controller own
the transaction boundary per the Data Integrity NFR in `Architecture.md` §5).
