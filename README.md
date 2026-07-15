# Drone Command Center

A secure, military-style **drone mission planning & command-and-control** web application.
Dark tactical UI (navy / black / gray with military-green accents), an interactive offline-capable
map planner, role-based access control, and full audit logging.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/React-19-blue) ![stack](https://img.shields.io/badge/Prisma-6-green) ![stack](https://img.shields.io/badge/Tailwind-4-teal)

---

## Run on Windows (easiest — just double-click)

1. Download the project (green **Code → Download ZIP** on GitHub, then unzip — or `git clone`).
2. Double-click **`START-APP.bat`**.

It installs Node.js if needed, installs dependencies, and opens the app at
**http://localhost:3000**. On first run it creates a `.env` from `.env.example` and asks
you to paste your database connection string (Supabase). Keep the black window open while
using the app; close it to stop.

> Prefer a faster app? Double-click **`START-APP-PRODUCTION.bat`** instead — it makes an
> optimized production build (adds ~1 minute the first time) and runs that.

## Quick start (manual / any OS)

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL + JWT_SECRET
npm run dev             # http://localhost:3000
```

> Node.js 18+ required. This build uses **PostgreSQL (Supabase)** — put your connection
> string in `.env` (see `.env.example`).

### Demo credentials


 ASK FROM ME FOR DEMO USE

A second operator (`operator2`) exists in **Pending Approval** state so you can try the
admin approval workflow under **User Management**.

---

## Roles & permissions (RBAC)

Enforced server-side in every API route (`src/lib/rbac.ts`), not just hidden in the UI.

| Capability | Admin | Operator | Viewer |
|---|:--:|:--:|:--:|
| View dashboard / missions / maps / drones | ✅ | ✅ | ✅ |
| Add drone · change drone status | ✅ | ✅ | — |
| Edit / delete drone | ✅ | — | — |
| Create / save missions, edit own (pre-approval) | ✅ | ✅ | — |
| Approve missions · generate ADC · change status | ✅ | — | — |
| Create / edit / delete No-Fly Zones | ✅ | — | — |
| Approve operator accounts · manage users | ✅ | — | — |

---

## Features

- **Auth** — self-hosted JWT (`jose`) in httpOnly cookies, `bcryptjs` password hashing,
  Edge middleware route protection, operator self-registration → admin approval.
- **Dashboard** — drone / mission / user summary cards, pie + bar charts (Recharts),
  live audit-log activity timeline.
- **Drone Directory** — searchable/filterable table, add/edit/status/delete with RBAC.
- **Mission Planner** — full-screen Leaflet map; click or type to drop waypoints
  (lat/lng/altitude/speed/hover); auto-joined flight path with live distance; switchable
  layers (Tactical / Street / Satellite / Terrain); no-fly zones drawn in red.
- **Missions** — list, detail with map preview + waypoints table + approval history,
  admin approve/reject → **sequential ADC number** generation, status transitions.
- **No-Fly Zones** — admins draw polygons on the map; everyone else views them.
- **Exports** — GeoJSON, CSV, and printable (PDF via print) flight plans.
- **Notifications** & **Audit Log** — every significant action recorded.

---

## Project structure

```
src/
  app/
    (auth)/           login + register (public)
    (app)/            authenticated shell: dashboard, planner, missions,
                      drones, no-fly-zones, users, notifications, profile, about
    api/              auth, drones, missions, users, nfz, notifications
  components/
    ui/               shadcn-style primitives (button, card, badge, modal, toast…)
    layout/           app shell (sidebar + topbar), page header
    dashboard/ drones/ missions/ planner/ nfz/ users/ notifications/
  lib/                prisma, auth, rbac, api helpers, constants, utils
  middleware.ts       JWT route protection
prisma/
  schema.prisma       Users, Drones, Missions, Waypoints, MapObjects,
                      NoFlyZones, Notifications, AuditLog
  seed.ts             demo data
```

---

## Database (PostgreSQL / Supabase)

The app runs on **PostgreSQL** (hosted on Supabase). Set your connection strings in `.env`
(copy from `.env.example`):

- `DATABASE_URL` → Supabase **transaction pooler** (port `6543`, `?pgbouncer=true`) for app runtime.
- `DIRECT_URL` → Supabase **session pooler** (port `5432`) for schema changes.

Then create the tables and load demo data:

```bash
npm run db:push    # create/sync all tables in your database
npm run db:seed    # load demo admin, users, drones, missions, markings
```

Enums are modeled as strings (constrained via TypeScript unions in `src/lib/constants.ts`).
The schema uses `db push` rather than migration files, so there is no `prisma/migrations` folder.

---

## Notes & known limitations

- **Offline maps** use online tile providers by default. True offline operation needs a
  local tile pack (e.g. `.pmtiles` / `.mbtiles`) served locally; the layer config in
  `src/components/planner/map-config.ts` is the single place to point at local tiles.
- Map drawing currently supports **waypoints** (the mission path) and **no-fly-zone
  polygons**. Freehand polygon/circle/rectangle/line mission overlays are scaffolded in the
  schema (`MapObject`) and render on the map, but interactive drawing of those shapes is a
  planned addition.
- Next.js 16 prints a `middleware` → `proxy` deprecation notice; the middleware works as-is.
- Secrets in `.env` are development defaults — replace `JWT_SECRET` before any real deployment.
