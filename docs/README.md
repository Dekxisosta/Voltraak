# Docs Index

| Doc | Purpose |
|---|---|
| `PRD.md` | Problem statement, goals, users, features, success metrics, release plan |
| `Architecture.md` | System overview, backend modules, roles/access model, branching strategy, NFRs — reference point for the C4 diagrams (Context/Container/Component/Code) from the Software Architecture Document |
| `Backend/Project-Structure.md` | Modular-monolith backend file structure — Core/Modules/Support/Providers/Console, standard per-module layout, dependency flow |
| `Backend/API.md` | Full REST API spec — all 55 endpoints, grouped by module, sprint-mapped build order, RBAC summary |
| `Backend/Services.md` | Core business logic — ROP/FEFO/variance formulas, key sequence flows |
| `Database/Database.md` | Data model — tables, relationships, design notes, migration order |
| `Frontend/Overview.md` | Stack, folder structure, API client layer, env config |
| `Frontend/Routing.md` | Route table, role guard (`RoleRoute`), root redirect logic |
| `Frontend/Components.md` | Shared component catalog (layout + common) |
| `Frontend/State-Management.md` | Auth/session state (`useAuth`), server-state pattern |
| `Frontend/Styling.md` | Design tokens (status colors), global styles |
| `Frontend/Design-System.md` | Shell layout, status-color language, table/form patterns, chart + responsive decisions |
| `Frontend/Pages.md` | Screen-by-screen inventory by role, backend deps per screen |
| `QA/Test-Plan.md` | Test scope, strategy, environments, sprint-mapped entry/exit criteria |
| `QA/Test-Cases.md` | Scenario-level test cases by role/module, with status + last-verified tracking |
| `QA/Bug-Log.md` | Bug/issue tracker |

Read order for a new contributor: PRD → Architecture → Backend/* → Database/Database.md →
Frontend/* → QA/*, then check `Backend/API.md` §Build Order / `Frontend/Pages.md` for whatever
sprint the team is currently on.
