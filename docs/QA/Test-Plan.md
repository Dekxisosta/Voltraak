# QA — Test Plan

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `../PRD.md`, `../Architecture.md`, `../Backend/API.md`, `Test-Cases.md`,
`Bug-Log.md`

---

## 1. Scope

Testing covers the three problem domains the PRD targets (`../PRD.md` §1, §5) plus the
cross-cutting RBAC model (`../Architecture.md` §3):

| Area | What's being verified |
|---|---|
| Demand Forecasting & ROP | ROP formula output, seasonal vs. non-seasonal branching, auto-generated procurement requests |
| Stock Tracking & Reconciliation | Stock-in/out transactional integrity, physical count variance calculation, reservation locking |
| Batch/Lot Tracking & FEFO | Batch state machine (Safe/Warning/Expired), FEFO pick ordering, expired-batch lockout |
| Reporting & KPI Dashboard | KPI aggregation accuracy, report exports, forecast chart data |
| RBAC | Server-side role enforcement on every mutating endpoint, client-side route gating |

Out of scope for this plan (per `../PRD.md` §6): POS integration, supplier portal, native mobile
scanning, multi-warehouse routing — nothing to test until these are in scope for a future release.

## 2. Strategy

- **Sprint-aligned:** test cases in `Test-Cases.md` are grouped to match the Release Plan in
  `../PRD.md` §8 — a phase's test cases become executable once its sprint ships, not before.
- **Role-based:** every test case is tagged to the role(s) it applies to (Warehouse Staff,
  Inventory Staff, Manager — `../PRD.md` §4), so coverage can be checked per-role, not just
  per-feature.
- **Metric-linked:** where a test case maps directly to a Success Metric (`../PRD.md` §3 —
  inventory accuracy, shrinkage rate, expiry write-offs, panic orders, discrepancy detection time),
  the test case says so, since these are the numbers that actually matter to the stakeholder.
- **RBAC checked twice:** once server-side (the endpoint itself, per `../Backend/API.md` §RBAC
  Summary) and once client-side (route gating, per `../Frontend/Routing.md`) — but a passing
  client-side check never substitutes for the server-side one.

## 3. Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Dev-driven smoke testing before PR | Seeded/fixture data |
| Staging | Sprint-end QA pass, integration testing | Anonymized-realistic dataset (enough volume to exercise ROP/forecast formulas meaningfully) |
| Production | Post-deploy smoke check only | Live data — no exploratory testing here |

## 4. Entry / Exit Criteria

**Entry** (a sprint's features are ready for QA):
- Endpoints for the sprint are shipped per `../Backend/API.md` §Build Order.
- Corresponding screens are wired to real data per `../Frontend/Pages.md` (not still stubs).

**Exit** (a sprint's QA is done):
- Every test case tagged to that sprint in `Test-Cases.md` has a non-empty `Status` and a
  `Last Updated` date within the sprint window.
- No open `Bug-Log.md` entry at Blocker/Critical severity for that sprint's scope.

## 5. Sprint 8 — Hardening Phase

Per `../PRD.md` §8, Sprint 8 is Integration Testing, bug fixes, and deployment — this is the pass
where every prior sprint's test cases get a full regression run, not just spot checks, before the
system fully replaces the spreadsheet (§7's rollout risk: partial rollout risks staff reverting to
manual tracking).

## 6. Continuity

See `README.md` §Coverage Continuity for how this plan holds up when the QA owner is unavailable —
short version: an unverified row is treated as failing, not passing, and any dev can self-verify
and log a result rather than waiting.
