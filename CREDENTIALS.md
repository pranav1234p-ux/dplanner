# Login Credentials — Drone Command Center

> Demo / seed accounts created by `npm run db:seed` (`prisma/seed.ts`).
> These are **development defaults** — change passwords and `JWT_SECRET` before any real deployment.
> The default admin username/password can be overridden via `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` in `.env`.

| Role | Username | Password | Approval Status | Notes |
|------|----------|----------|-----------------|-------|
| **Administrator** | `admin` | `Admin@123` | Approved | Full control |
| **Operator** | `operator1` | `Operator@123` | Approved | Can plan/save missions, add drones |
| **Operator** | `operator2` | `Operator@123` | **Pending Approval** | Use to test the admin approval workflow |
| **Viewer** | `viewer1` | `Viewer@123` | Approved | Read-only access |

## Notes
- New operators self-register at `/register` and start as **Pending Approval** until an administrator approves them under **User Management**.
- Passwords are stored hashed with bcrypt; these plaintext values exist only in the seed script for local testing.
- To reset all accounts and data to this state: `npm run db:reset` (or `npm run db:seed`).
