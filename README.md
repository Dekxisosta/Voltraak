<div align="center">

# 📦 Voltraak
### WalangBrownout Appliances

Real-time inventory, reconciliation, and FEFO-enforced batch tracking — replacing a manual
spreadsheet that couldn't keep up with a 35% sales-growth curve.

</div>

---

## Tech Stack

**Backend**

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**Frontend**

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-F56565?style=for-the-badge&logo=lucide&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)

**Tooling**

![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

---

## About

Three problems drove this build — see [`docs/PRD.md`](docs/PRD.md) for the full breakdown:

| Problem | Fix |
|---|---|
| No real-time sales-velocity data → panic-driven purchasing | Automated Reorder Point (ROP) calculation + forecasting |
| Recorded stock vs. physical stock diverging (73% shrinkage observed) | Daily reconciliation + variance alerting |
| LIFO picking, no batch/lot tracking (₱15k+ write-offs) | FEFO-enforced picking, batch expiry state machine |

Architecture is a **modular monolith** — one deployable Laravel backend, internally partitioned by
business domain, paired with a React SPA. Full details in [`docs/Architecture.md`](docs/Architecture.md)
and [`docs/Backend/Project-Structure.md`](docs/Backend/Project-Structure.md).

## Documentation

All project docs live in [`docs/`](docs/) — start at [`docs/README.md`](docs/README.md) for the
full index and suggested read order. Quick links:

| | |
|---|---|
| 📋 [PRD](docs/PRD.md) | Problem statement, goals, success metrics, release plan |
| 🏗️ [Architecture](docs/Architecture.md) | System overview, modules, roles, NFRs |
| 🔧 [Backend](docs/Backend/) | Project structure, API spec, services/business logic |
| 🗄️ [Database](docs/Database/) | Schema, relationships, migrations |
| 🎨 [Frontend](docs/Frontend/) | Stack, routing, components, styling, pages |
| ✅ [QA](docs/QA/) | Test plan, test cases, bug log |

## Collaborators

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Dekxisosta">
        <img src="https://github.com/Dekxisosta.png" width="90" height="90" style="border-radius:50%" alt="Dekxisosta"/><br />
        <b>Dekxisosta</b>
      </a><br />
      Project Lead
    </td>
    <td align="center">
      <a href="https://github.com/brtbrt123">
        <img src="https://github.com/brtbrt123.png" width="90" height="90" style="border-radius:50%" alt="brtbrt123"/><br />
        <b>brtbrt123</b>
      </a><br />
      Full-stack Lead
    </td>
    <td align="center">
      <a href="https://github.com/SHUBARUUU">
        <img src="https://github.com/SHUBARUUU.png" width="90" height="90" style="border-radius:50%" alt="SHUBARUUU"/><br />
        <b>SHUBARUUU</b>
      </a><br />
      Backend Lead
    </td>
    <td align="center">
      <a href="https://github.com/LiaKyutie">
        <img src="https://github.com/LiaKyutie.png" width="90" height="90" style="border-radius:50%" alt="LiaKyutie"/><br />
        <b>LiaKyutie</b>
      </a><br />
      Frontend Developer
    </td>
    <td align="center">
      <a href="https://github.com/RylineAzurin">
        <img src="https://github.com/RylineAzurin.png" width="90" height="90" style="border-radius:50%" alt="RylineAzurin"/><br />
        <b>RylineAzurin</b>
      </a><br />
      Support Developer
    </td>
  </tr>
</table>

---

<div align="center">

Built for **WalangBrownout Appliances**

</div>
