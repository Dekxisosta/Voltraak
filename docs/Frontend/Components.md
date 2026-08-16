# Frontend — Components

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Overview.md`, `Styling.md`, `Design-System.md`

---

## 1. Layout Components (`components/layout/`)

### `AppShell`
Props: `{ role: Role; children: ReactNode }`. Renders the persistent two-column layout —
`Sidebar` on the left, page content in a padded `<main>`. Mounted once per `RoleRoute` group (see
`Routing.md`), not per page — pages don't re-render the shell.

### `Sidebar`
Props: `{ role: Role }`. Looks up `NAV_BY_ROLE[role]` and renders one `NavLink` per entry, active
link highlighted. Nav lists per role (currently):

| Role | Nav items |
|---|---|
| warehouse | Receiving, Picking, FEFO, Discrepancies |
| inventory | Stock In/Out, Damage Report, Item Update, Stock Levels, Reservations, Expiry Alerts |
| manager | KPI Dashboard, Forecast Reports, Inventory Reports, Low Stock Alerts, PO Approvals |

Adding a page without adding its nav entry here makes it URL-only reachable — see `Routing.md` §4.

## 2. Common Components (`components/common/`)

### `StatusBadge`
Props: `{ tone: StatusTone; label: string; icon?: LucideIcon }`. Renders a colored pill using the
`status-*` Tailwind color classes (see `Styling.md` §3) driven by `tone`. Pairs an icon from
`lucide-react` with the text `label` per the accessibility requirement in `Design-System.md` §2
(status must never be color-only) — e.g. `CheckCircle2` for `ok`, `AlertTriangle` for `warning`,
`XCircle` for `critical`. This is the only component that should reach for the `status-*` classes
directly; anything needing a status color elsewhere should render a `StatusBadge` rather than
duplicating the class names itself.

## 3. Planned / Referenced but Not Yet in `components/`

The original frontend work plan calls for a shared foundation beyond what's built so far:
`<DataTable>` (sortable, filterable), `<StatCard>`, `<SearchBar>`, `<FormField>`, and a toast/
notification system. These don't exist as files yet — when building a page that needs one, add it
under `components/common/` (role-agnostic) and document it in this file rather than building a
page-local one-off, since multiple role pages (Stock Levels, Inventory Reports, KPI Dashboard)
share the same table/card/badge patterns.

## 4. Component Conventions

- Styling is Tailwind utility classes (see `Styling.md` §3) — this is the target convention for
  all new components. `AppShell`/`Sidebar` still carry some of the earlier inline `style={{...}}`
  objects; migrate them to Tailwind classes when touching those files rather than adding more
  inline styles.
- Status colors always come from the `status-*` Tailwind classes (never a hardcoded hex, never the
  `statusColors` object directly outside `StatusBadge`) — `Sidebar`'s `#1e293b`/`#334155` are the
  current exception (layout chrome, not status color) and not a pattern to copy for anything
  status-related; migrate these to Tailwind's default palette or a themed `sidebar` color when
  touching `Sidebar`.
- Icons come from `lucide-react` — import individual icons (`import { AlertTriangle } from
  "lucide-react"`), don't add a second icon library.
- Motion/transitions use `framer-motion` — wrap the element in `motion.div` (or the relevant
  `motion.*`) rather than hand-rolling CSS transitions. Candidates as pages get built out: route
  transitions in `AppShell`, the Sidebar active-link indicator, toast/notification enter-exit (see
  §3's planned notification system), and row enter/exit on the future `<DataTable>`.
- Components take role/data as props; they don't fetch their own data — fetching happens in the
  page component via `api/*.ts` (see `State-Management.md`).
