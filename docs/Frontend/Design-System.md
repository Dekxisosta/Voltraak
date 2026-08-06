# Frontend — Design System

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Styling.md`, `Components.md`, `Pages.md`

This doc sits above `Styling.md`: tokens are the raw values, this is the visual language built on
top of them — layout conventions and component patterns every screen should follow, sourced from
the low-fidelity mockups referenced throughout the original frontend work plan (Architecture Doc
§9) and the shared-foundation items from that plan.

---

## 1. Shell Layout

- Fixed-width dark sidebar (currently 220px, `#1e293b` background) + light content area, full
  viewport height. This is the pattern in every low-fi mockup and is already implemented in
  `AppShell`/`Sidebar` (`Components.md` §1).
- Sidebar: logo/product name at top, then a flat list of role-scoped nav items — no nested/
  collapsible nav in the current design.
- Content area: consistent outer padding (currently 24px), no additional chrome — each page owns
  its own internal layout.

## 2. Status Color Language

Four tones (`ok` / `warning` / `critical` / `neutral`) mapped consistently across every domain —
stock levels, batch/expiry state, workflow state. Full mapping and hex values in `Styling.md` §2.
**Accessibility requirement (from the frontend work plan's Sprint 8 pass):** status must never be
color-only — pair every `StatusBadge` with its text label (already true — `StatusBadge` always
renders `label`) and, now that `lucide-react` is the icon library, a matching icon (see
`Components.md` §1).

## 3. Table Pattern

Most role screens are fundamentally a filtered/sortable list of records (transaction ledger,
batches, reservations, discrepancy reports, POs). The intended shared pattern — a `<DataTable>`
component (sortable, filterable) — hasn't been built yet (`Components.md` §3). Until it exists,
new list screens should still follow the same shape so migrating to a shared component later is a
drop-in, not a rewrite: consistent column header row, row-level `StatusBadge` where applicable,
filter controls above the table rather than inline per-column.

## 4. Form Pattern

Transaction-entry screens (Stock In/Out, Physical Counts, Damage Report, Discrepancy Report) share
a shape: a form for the new entry above, a log/list of recent entries below, so staff get
immediate feedback that their action registered. Variance/accuracy numbers should surface
immediately at the point of entry, not only in a separate report (explicit requirement from the
work plan's Sprint 4 notes).

## 5. Charts

Two chart needs are called out in the work plan (Forecast Reports' 8-week demand bar chart, KPI
Dashboard's trend bar chart + category donut) but no chart library is installed yet. **Open
decision:** recharts vs. chart.js — pick one before building Sprint 6–7 screens so these aren't
rebuilt mid-plan. Record the decision here once made.

## 6. Responsive Priority

Warehouse Staff screens (Receiving, Picking, FEFO, Discrepancies) are the highest priority for
mobile/tablet responsiveness — they're used on the warehouse floor, not at a desk. Inventory Staff
and Manager screens can assume a desktop-class viewport for v1.
