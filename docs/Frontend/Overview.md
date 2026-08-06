# Frontend — Overview

## Inventory Management System (IMS) — WalangBrownout Appliances

**Stack:** React SPA, TypeScript, Vite, Tailwind CSS, Framer Motion, lucide-react
**Companion docs:** `../PRD.md`, `../Architecture.md`, `../Backend/API.md`

---

## 1. Stack & Entry Point

- **Build tool:** Vite
- **Router:** `react-router-dom` (`BrowserRouter`)
- **Entry:** `frontend/src/main.tsx` mounts `<App />` inside `<BrowserRouter>` and imports the
  global stylesheet (`styles/index.css`).
- **`App.tsx`** is a thin wrapper — it just renders `<AppRoutes />`. All routing/auth branching
  lives in `routes/`.
- **Styling:** Tailwind CSS — see `Styling.md` for the token → Tailwind theme mapping.
- **Animation:** `framer-motion` — see `Components.md` §4 for where it's used.
- **Icons:** `lucide-react` — see `Components.md` §2 for `StatusBadge`'s icon usage.

## 2. Folder Structure

```
frontend/src/
├── api/            Typed API layer — one file per backend module (auth, inventory, procurement, reporting) + client.ts
├── components/
│   ├── common/     Shared, role-agnostic UI (StatusBadge, etc.)
│   └── layout/     Shell/nav (AppShell, Sidebar)
├── features/       Feature-scoped screens that aren't role pages (e.g. auth/LoginPage)
├── hooks/          Cross-cutting React hooks (useAuth)
├── pages/          Role-scoped screens, one folder per role (warehouse/, inventory-staff/, manager/)
├── routes/         AppRoutes (route table), RoleRoute (guard)
├── styles/         index.css (Tailwind directives + globals), tokens.ts (design tokens, mirrored into Tailwind theme)
└── types/          Shared TS types, mirrors backend models
```

Tailwind config lives at `frontend/tailwind.config.ts` (project root, alongside `vite.config.ts`),
not under `src/` — see `Styling.md` §2 for what it extends.

## 3. Talking to the Backend

`api/client.ts` is a single typed fetch wrapper (`apiClient.get/post/patch/delete`) that every
`api/*.ts` file builds on. It:
- Reads the base URL from `VITE_API_BASE_URL` (falls back to `http://localhost:8000/api`).
- Attaches the bearer token from `localStorage` on every request.
- On `401`, clears the token and redirects to `/login`.
- Throws on any non-OK response using the server's `message` field when present.

Module-specific API files (`auth.ts`, `inventory.ts`, `procurement.ts`, `reporting.ts`) wrap
`apiClient` with typed methods per endpoint — see `../Backend/API.md` for the endpoints each one
should cover.

## 4. Env Config

`frontend/.env.example` documents the required variables (`VITE_API_BASE_URL` at minimum). Copy
to `.env` before running — see the root `README.md` for the Docker/native setup paths.

## 5. Where Things Go From Here

- Routing details → `Routing.md`
- Shared component catalog → `Components.md`
- Auth/session state → `State-Management.md`
- Token system → `Styling.md`
- Visual language above raw tokens → `Design-System.md`
- Screen-by-screen inventory → `Pages.md`
