# Product Requirements Document (PRD)
## Inventory Management System (IMS) — WalangBrownout Appliances

**Status:** Draft
**Owner:** ABARQUIZ, ARISCON, ASUNCION, AZURIN, BALOIS
**Stakeholder:** Joseph Cartagenas
**Related doc:** Software Architecture Document (IMS), Technical Spec (this pairing)

---

## 1. Problem Statement

WalangBrownout Appliances has grown sales 35% over two years, but profitability is declining. The
root cause is a single, manually updated weekly spreadsheet that can no longer support the
operational demands of a growing regional distributor. This produces three compounding problems:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Summer Crunch** — no real-time sales-velocity data → reactive, panic-driven purchasing (Bullwhip Effect) | High holding costs, tied-up capital, lost sales during peak demand |
| 2 | **Mystery Shrinkage** — recorded stock (45 units) vs. physical stock (12 units), a 73.33% shrinkage rate | Canceled orders, customer dissatisfaction, financial loss |
| 3 | **Expiry Trap** — LIFO picking with no batch/lot tracking | ₱15,000+ in write-offs, wasted warehouse space, risk of shipping degraded stock |

## 2. Goal

Replace the manual, error-prone spreadsheet process with a real-time, decision-supporting
inventory platform that gives every role (Warehouse, Inventory, Manager) accurate, live visibility
into stock — and enforces the operational rules (FEFO, reorder points, reconciliation) that the
spreadsheet can't.

## 3. Success Metrics

| Metric | Baseline | Target |
|---|---|---|
| Inventory accuracy (physical ÷ recorded × 100) | 26.67% | ≥ 98% |
| Shrinkage rate | 73.33% | < 5% (matches the variance alert threshold) |
| Expiry write-offs | ₱15,000 / incident | Near-zero (batches flagged 60 days pre-expiry) |
| Stockout-triggered panic orders | Frequent (3x normal order volume observed) | Eliminated via automated ROP-based reordering |
| Time to detect a discrepancy | End of week (manual spreadsheet cycle) | Same-day (daily cycle counts) |

## 4. Users / Roles

| Role | Core Need |
|---|---|
| **Warehouse Staff** | Receive, store, and pick inventory correctly (FEFO-compliant), flag discrepancies immediately |
| **Inventory Staff** | Record every stock movement in real time, manage reservations, monitor expiry and stock health |
| **Manager** | See real-time KPIs, approve purchase orders, act on forecasts before stockouts/write-offs happen |

Access is role-scoped — each role only sees and can act on functions relevant to it (enforced by
the User Management Module).

## 5. Feature Set (by problem solved)

### 5.1 Demand Forecasting & Reorder Points *(solves Summer Crunch)*
- Historical-sales-based demand forecasting, distinguishing seasonal vs. non-seasonal items.
- Automated Reorder Point (ROP) calculation and alerting.
- Auto-generated procurement requests once stock crosses threshold.
- Manager approval workflow for resulting purchase orders.

### 5.2 Real-Time Stock Tracking & Reconciliation *(solves Mystery Shrinkage)*
- Every stock movement (receipt, sale, transfer, return) recorded in real time.
- Daily physical cycle counts reconciled against system records.
- Automatic variance alerts once discrepancy exceeds a defined threshold (default 5%).
- Reservation system so committed stock can't be double-sold.
- Full accountability trail (who recorded what, when).

### 5.3 Batch/Lot Tracking & FEFO Enforcement *(solves Expiry Trap)*
- Batch tracking with manufacture date and expiry date per lot.
- System-directed FEFO (First-Expired, First-Out) picking — replaces manual LIFO habit.
- Expiry state machine: Safe → Warning (≤60 days) → Expired (locked, removed from sale).
- Clearance-promotion flag when a batch enters Warning state.

### 5.4 Reporting & KPI Dashboard
- Live KPIs: turnover, availability, shrinkage rate, low-stock counts.
- Forecast reports (8-week demand horizon).
- Exportable inventory reports by date range.
- Low-stock alert queue with one-click reorder trigger.

### 5.5 Role-Based Dashboards
- **Warehouse Staff:** Receiving List, Picking List, FEFO Recommendations, Discrepancy Report.
- **Inventory Staff:** Stock In/Out, Damage Report, Item Update, Stock Levels, Reservation List, Expiry Alerts.
- **Manager:** KPI Dashboard, Forecast Reports, Inventory Reports, Low Stock Alerts, PO Approvals.

## 6. Out of Scope (v1)

- POS integration (planned as a future extension, not part of initial delivery)
- Supplier-facing self-service portal
- Native mobile barcode-scanning app (mobile web only)
- Multi-warehouse / multi-location routing logic

The architecture is intentionally modular so these can be added later without redesigning the
foundation.

## 7. Assumptions & Constraints

- Delivered as a modular monolith: React SPA + Laravel + MySQL (see Spec doc for details).
- Team follows Scrum, 8 sprints over 10 weeks, foundation-first (auth/core inventory before
  business-logic features).
- Barcode/QR scanning is assumed available at receiving and picking stations.
- All three problem domains (forecasting, shrinkage, expiry) must ship before the system fully
  replaces the spreadsheet — partial rollout risks staff reverting to manual tracking.

## 8. Release Plan (maps to Sprint plan in Architecture Doc)

| Phase | Sprints | Delivers |
|---|---|---|
| Foundation | 1–3 | Auth/RBAC, core inventory CRUD + stock in/out, supplier & PO base |
| Shrinkage Prevention | 4 | Physical count reconciliation, discrepancy detection |
| Expiry Management | 5 | FEFO batch tracking, expiry alerts |
| Demand Forecasting | 6 | ROP calculation, seasonal/non-seasonal thresholds |
| Reporting | 7 | KPI dashboard, reports, alerts |
| Hardening | 8 | Integration testing, bug fixes, deployment |

## 9. Risks

| Risk | Mitigation |
|---|---|
| Staff reverts to spreadsheet habits during transition | Role-scoped, task-first dashboards (picking list, stock in/out) designed to be faster than spreadsheet entry |
| Barcode/QR scanning not consistently used at receiving | Discrepancy Report + daily cycle counts catch drift regardless of scanning discipline |
| Forecast model needs real sales history to be accurate | ROP falls back to safety-stock-only mode until 12 months of transaction data accumulates |
