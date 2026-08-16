# QA — Index

## Inventory Management System (IMS) — WalangBrownout Appliances

| Doc | Purpose |
|---|---|
| `Test-Plan.md` | Scope, strategy, environments, entry/exit criteria per sprint phase |
| `Test-Cases.md` | Scenario-level test cases by role/module, with status + last-verified tracking |
| `Bug-Log.md` | Lightweight bug/issue tracker |

---

## Ownership Model

QA docs are owned by the support/QA developer day-to-day, but **every entry in `Test-Cases.md`
and `Bug-Log.md` carries an explicit `Owner` and `Last Updated` field.** This isn't extra
process for its own sake — it's what makes gaps visible without having to ask anyone. A stale
`Last Updated` date on a row is the signal that row needs attention, not a status update chased
down in chat.

**Backend and frontend devs write their own change docs** (per module, in `Backend/` and
`Frontend/`) as usual — QA docs here don't duplicate that. What lives here is test coverage and
defect tracking *of* those changes, not the changes themselves.

## Coverage Continuity

Because QA is currently a single person, treat any test row without a `Last Updated` inside the
current sprint window as **unverified, not passing** — don't assume silence means it's fine.

If the QA owner is out for more than a couple of days during an active sprint:
1. Whoever's PR touches an area with no recent QA coverage in `Test-Cases.md` should self-verify
   against the relevant test cases before merge, and log the result themselves (any dev can edit
   `Test-Cases.md`/`Bug-Log.md` — these aren't QA-only files).
2. Don't let untested rows silently roll into the next sprint's plan — flag them at sprint
   planning instead of assuming they were covered.
3. When the QA owner returns, they reconcile self-verified rows rather than re-running everything
   from scratch — the `Owner` field on each row shows who last touched it.

## Read Order

`Test-Plan.md` (what we're testing and how) → `Test-Cases.md` (the actual scenarios, checked as
sprints ship) → `Bug-Log.md` (anything that failed).
