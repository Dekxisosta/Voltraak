# Frontend — State Management

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Overview.md`, `Routing.md`, `../Backend/API.md`

---

## 1. Current Approach

No global state library (Redux/Zustand/etc.) is wired up. State is handled by:

- **Auth/session state:** one hook (`useAuth`), consumed at the top of `AppRoutes`.
- **Server data:** fetched per-page via the typed `api/*.ts` modules, held in local component
  state (`useState`/`useEffect`) — no shared cache layer yet.
- **Token persistence:** `localStorage`, read directly by `api/client.ts` and `useAuth` (not
  passed through React state/context).

## 2. `useAuth`

`frontend/src/hooks/useAuth.ts` — the only auth-state hook in the app; `AppRoutes` calls it once
and passes `user` down to `RoleRoute`.

- **On mount:** if no `ims_token` in `localStorage`, resolves immediately with `user = null`.
  Otherwise calls `authApi.me()` and sets `user` from the response.
- **`login(email, password)`:** calls `authApi.login`, stores the returned token in
  `localStorage`, sets `user`, returns the user.
- **`logout()`:** calls `authApi.logout`, clears the token, clears `user`.
- Returns `{ user, loading, login, logout }`.

`loading` exists so `AppRoutes` can render `null` while the initial `/auth/me` check is in flight,
avoiding a flash of the login page for an already-authenticated user.

## 3. Server State Pattern

Each page component is expected to own its own fetch: call the relevant `api/*.ts` method inside
a `useEffect`, hold the result in local `useState`, handle loading/error state locally. There's no
shared query cache (React Query, SWR, etc.) yet — if two pages need the same data, they each fetch
it independently.

**Note for Sprint 8 (Integration & Testing):** the frontend work plan calls out empty/loading/
error states as a required pass on every screen — that's a per-page responsibility under this
pattern, not something a shared layer provides for free.

## 4. If This Needs to Change

If page-local fetching starts causing duplicate requests or stale-data bugs across pages that
share data (e.g. product stock levels shown on both an Inventory Staff page and a Manager report),
that's the signal to introduce a shared server-state layer (React Query is the natural fit given
the existing fetch-based `apiClient`). Document the decision here when it happens — don't let two
patterns coexist silently.
