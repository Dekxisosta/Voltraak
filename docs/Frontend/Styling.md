# Frontend — Styling

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Components.md`, `Design-System.md`

---

## 1. Global Styles

`frontend/src/styles/index.css` — Tailwind's `@tailwind base/components/utilities` directives,
plus what's left of the pre-Tailwind globals (system-font stack on `:root`, zeroed body margin).
Imported once, in `main.tsx`. See §3 for the Tailwind config this pairs with.

## 2. Design Tokens (`styles/tokens.ts`)

The single source of truth for status colors, shared across `StatusBadge`, charts, and stock-level
bars. The file comment is explicit: **do not hardcode these colors anywhere else in the app.**

```ts
export const statusColors = {
  ok: "#22c55e",       // in-stock, confirmed, safe batch
  warning: "#f59e0b",  // low stock, pending, warning batch
  critical: "#ef4444", // critical stock, expired batch, rejected
  neutral: "#94a3b8",
} as const;

export type StatusTone = keyof typeof statusColors;
```

### Tone → meaning mapping

One tone, several meanings depending on context — this is intentional (a single visual language
for "this needs attention" across different domains):

| Tone | Stock context | Batch/expiry context | Workflow context |
|---|---|---|---|
| `ok` | In-stock | Safe | Confirmed |
| `warning` | Low stock | Warning (≤60 days) | Pending |
| `critical` | Critical/out of stock | Expired | Rejected |
| `neutral` | — | — | Default/unset |

This mapping is what lets `StatusBadge` stay a single dumb component (`Components.md` §2) instead
of needing per-domain variants.

## 3. Styling Method — Tailwind CSS

**Decision recorded:** the frontend uses Tailwind CSS. This resolves the open point that used to
sit here — inline `style={{...}}` objects (`AppShell`, `Sidebar`, `StatusBadge`) are being migrated
to Tailwind utility classes; see `Components.md` §4 for the current-state convention during that
migration.

- `frontend/src/styles/index.css` carries the `@tailwind base; @tailwind components; @tailwind
  utilities;` directives plus whatever global/system-font rules remain outside Tailwind's reset.
- `frontend/tailwind.config.ts` extends the default theme with the `statusColors` above under
  `theme.extend.colors.status` (`ok`, `warning`, `critical`, `neutral`), so `bg-status-ok`,
  `text-status-warning`, etc. are available as utility classes rather than components reading
  `statusColors` as a JS object directly.
- `styles/tokens.ts` stays as the single source of truth for the color *values* — the Tailwind
  config imports from it rather than duplicating the hex codes, so `Components.md` §4's rule ("only
  `StatusBadge` reads `statusColors` directly") now also means: everything else should reach for
  the `status-*` Tailwind classes, not either the token object or a hardcoded hex.

## 4. Adding a New Token

If a new status meaning doesn't fit the existing four tones, add it to `statusColors` rather than
inventing a one-off color in a component — and update the mapping table above so the next person
building a page knows which tone to reach for.
