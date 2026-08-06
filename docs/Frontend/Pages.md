# Frontend — Pages

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Routing.md`, `../Backend/API.md`, `../PRD.md` §5

Screen-by-screen reference, organized by role. All 16 page files exist as routed stubs
(`frontend/src/pages/{role}/*.tsx`) — this doc tracks what each screen is *for* and what it needs
to build out to, cross-referenced to its backend dependency. It replaces the old sprint-plan
framing: check `git log`/the page file itself for actual build status rather than treating
anything here as "done."

---

## Warehouse Staff

| Screen | Route | File | Backend deps | Purpose |
|---|---|---|---|---|
| Receiving List | `/warehouse/receiving` | `ReceivingPage.tsx` | `/batches`, `/purchase-orders/{id}/receive` | Item, supplier, qty expected, status badge, "Confirm Receipt" |
| Picking List | `/warehouse/picking` | `PickingPage.tsx` | `/stock-out`, `/fefo-recommendations` | Route-grouped items, bin location, batch ref, picked status, "Mark Complete" |
| FEFO Recommendations | `/warehouse/fefo` | `FEFOPage.tsx` | `/fefo-recommendations` | Batch, item, expires-in, urgency color, note panel, "Confirm Pick Order" |
| Discrepancies | `/warehouse/discrepancies` | `DiscrepanciesPage.tsx` | `/discrepancy-reports`, `/physical-counts` | Form (item, expected qty, actual qty, type, notes) + recent-reports log with open/resolved badges |

## Inventory Staff

| Screen | Route | File | Backend deps | Purpose |
|---|---|---|---|---|
| Stock In/Out | `/inventory/stock-in-out` | `StockInOutPage.tsx` | `/stock-in`, `/stock-out` | Toggle form (item/SKU, quantity, reference no., reason) + today's transaction log with in/out badges |
| Damage Report | `/inventory/damage-report` | `DamageReportPage.tsx` | `/damage-reports` | Item/SKU, qty damaged, damage type, photo-evidence upload, notes |
| Item Update | `/inventory/item-update` | `ItemUpdatePage.tsx` | `/products/{id}` (PATCH) | Thumbnail, editable unit price, reorder point, supplier, storage bin |
| Stock Levels | `/inventory/stock-levels` | `StockLevelsPage.tsx` | `/products/{id}/stock-levels` | Location, stock-level bar, status badge |
| Reservations | `/inventory/reservations` | `ReservationsPage.tsx` | `/reservations` | Item, reserved-for, qty, status badge |
| Expiry Alerts | `/inventory/expiry-alerts` | `ExpiryAlertsPage.tsx` | `/expiry-alerts` | Mirrors FEFO visual language but framed as monitoring/alerting, not picking |

## Manager

| Screen | Route | File | Backend deps | Purpose |
|---|---|---|---|---|
| KPI Dashboard | `/manager/kpi` | `KPIDashboardPage.tsx` | `/dashboard/kpi` | 4 stat cards (Total SKUs, Stock Value, Low Stock Items, Shrinkage Rate) + inventory trend bar chart + category breakdown donut |
| Forecast Reports | `/manager/forecast` | `ForecastReportsPage.tsx` | `/reports/forecast` | 8-week demand bar chart + item table with seasonal-trend bar and suggested reorder qty |
| Inventory Reports | `/manager/reports` | `InventoryReportsPage.tsx` | `/reports/inventory`, `/reports/inventory/export` | Date-range picker, Export action, item/category/movement/value table |
| Low Stock Alerts | `/manager/low-stock` | `LowStockAlertsPage.tsx` | `/reorder-points` | Item, current stock bar, reorder point, inline "Reorder" action |
| PO Approvals | `/manager/po-approvals` | `POApprovalsPage.tsx` | `/purchase-orders`, `/purchase-orders/{id}/approve` | PO reference, supplier, total, status, inline Approve/Reject |

Manager also gets **User Management** (list/create/edit role+status) — not in `AppRoutes.tsx` yet;
add it under `/manager/` alongside the table above once built, backed by `/users`.

---

## Cross-Cutting, Not Yet a Dedicated Page

- **Notifications** — bell icon + feed, backed by `/notifications`, meant to live in `AppShell`
  (persistent across all role pages) rather than as its own route.

## Build Reference

For which endpoints exist yet, see `../Backend/API.md` §Build Order. A page can be fleshed out
once its backend deps in the tables above are shipped — check the API doc's sprint mapping before
starting a screen that depends on an unbuilt endpoint.
