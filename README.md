# SoftwArt — Backend

> 🇨🇴 También disponible en [español](./README.es.md)

REST API powering **SoftwArt**, a business management system built for Arte Café — a framing and marquetry shop in Medellín, Colombia. The business previously relied entirely on physical records: paper agendas, handwritten receipts, and verbal payment agreements. That workflow caused real problems — customers had to visit in person just to book an appointment, and the owner dealt with constant disputes over payments with no paper trail.

SoftwArt replaces all of that. It covers the full business cycle from client registration to final payment, and exposes a REST API consumed by both the web panel and the Android mobile app.

🌐 **Live:** [softwart.online](https://softwart.online)

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Language | TypeScript |
| ORM | TypeORM |
| Database | PostgreSQL (Supabase in production) |
| Auth | JWT (8h) + bcrypt (salt 10) |
| Validation | Zod — `validate(schema)` middleware, 422 on failure |
| Security headers | Helmet |
| Rate limiting | express-rate-limit |
| Email | nodemailer (Gmail SMTP) |
| API docs | OpenAPI 3.0 + Swagger UI (dev) / Redoc (prod) |
| Tests | Vitest + supertest (24 tests) |
| Deploy | Render |

---

## Architecture

Strict **MVC pattern** with clear separation of concerns:

```
src/
├── controllers/   — endpoint logic
├── models/        — TypeORM entities (15 total)
├── routes/        — per-module route registration
├── middlewares/   — auth, cors, rate limiting, validate, 404 handler
├── schemas/       — Zod schemas by domain (auth, account, appointment, sale)
├── errors/        — custom error hierarchy (AppError → subtypes)
├── helpers/       — reusable business logic (installment calculation)
├── services/      — email service (fire & forget)
├── seeds/         — initial system data
├── migrations/    — TypeORM migrations (synchronize: false in prod)
├── docs/          — swagger.ts (OpenAPI 3.0 spec)
├── tests/
│   ├── unit/        — installments.helper.test.ts
│   └── integration/ — auth.test.ts, create-sale.test.ts
├── app.ts         — Express app setup (exports `app`)
└── server.ts      — bootstrap: DB init, seeds, listen
```

### Design decision: Usuario vs Cliente as separate entities

`Usuario` (authentication) and `Cliente` (business domain) are **independent entities**, linked by email address without a direct foreign key. This keeps the auth system decoupled from the business model — admin users can exist without being customers.

JWT payload: `{ id_usuario, correo, id_rol, rol, id_cliente }`

### Core business flow

```
Clients → Appointments → Convert to sale → Sales → Installments → Orders → Payments
```

Converting an appointment into a sale is an **atomic transaction**: it creates `Venta` + `DetalleVenta` records and updates the appointment status to `Completada` in a single operation.

### Flexible installment model

- `num_abonos` (default: 2) and `porcentaje_primer_abono` (default: 70%)
- First installment = `total × pct / 100`; middle installments split the remainder equally; last = exact balance
- Plan configuration is locked once any payment has been registered
- Sale is automatically marked as paid when all installments are completed

---

## Entities (15)

`Usuario` · `Rol` · `Permiso` · `PermisoRol` · `Cliente` · `Servicio` · `EstadoCita` · `EstadoServicio` · `MetodoPago` · `EstadoPago` · `Cita` · `Marco` · `Venta` · `DetalleVenta` · `Pago`

---

## Security

| Mechanism | Detail |
|---|---|
| Helmet.js | HTTP security headers (CSP, X-Frame-Options, HSTS) |
| JWT fail-fast | Server refuses to start if `JWT_SECRET` is not defined |
| Zod validation | 422 on all body-receiving endpoints via `validate(schema)` |
| Rate limiting | 100 req/15min general · 10 req/15min auth routes |
| CORS | `localhost:3000` and `softwart.online` only |
| bcrypt | Salt rounds = 10 |
| RBAC | `requireRol()`, `requireCliente()`, `requirePermission()` |

---

## Key endpoints

### Public — Auth

```
POST /api/auth/login
POST /api/auth/register              — also links to an existing guest Client if the email matches
POST /api/auth/recover
POST /api/auth/reset-password
POST /api/auth/reenviar-codigo
GET  /api/auth/availability?fecha=YYYY-MM-DD     — public, booked slots only (no private data)
POST /api/auth/guest-appointment                 — public, creates Client+Appointment atomically (no account needed)
POST /api/auth/register-guest                    — public, creates Client only (no User)
GET  /api/auth/me/permissions        — verifyToken, returns permission names for the current user's role
```

### Client portal (`verifyToken` + `requireCliente`)

```
GET    /api/account/perfil
PUT    /api/account/perfil
GET    /api/account/citas
POST   /api/account/citas
PATCH  /api/account/citas/:id/cancelar
GET    /api/account/disponibilidad?fecha=YYYY-MM-DD
GET    /api/account/servicios          — service details with live status for the authenticated client
DELETE /api/account
```

### Admin / employee panel

```
POST  /api/appointments/:id/create-sale
GET   /api/sales/:id/payment-plan
POST  /api/sales/:id/installment
PATCH /api/sales/:id/configure-installments
```

**Auto no-show**: `GET /api/appointments` runs a side-effect UPDATE before returning results — any appointment with status `Pendiente` whose `fecha + hora + 3h < NOW()` is automatically changed to `No Asistió`. No cron job required.

Full API reference: [softwart-docs](https://github.com/SoftwArt/softwart-docs) (Redoc, GitHub Pages)

---

## Running locally

```bash
git clone https://github.com/SoftwArt/softwart-backend
cd softwart-backend
npm install
cp .env.example .env   # fill in DB_*, JWT_SECRET, SMTP_*, FRONTEND_URL
npm run seed
npm run dev            # → http://localhost:3001
```

### Or with Docker

```bash
docker compose up --build
docker compose exec backend npm run seed   # first time only
docker compose down -v                     # full reset
```

PostgreSQL 16 on `localhost:5432` (user/pass/db: `softwart`). Backend on `localhost:3001`.

---

## API documentation

- **Dev**: Swagger UI at `http://localhost:3001/api/docs` — not exposed in production
- **Prod**: Redoc static docs at [softwart-docs](https://github.com/SoftwArt/softwart-docs)

```bash
npm run docs:export   # generates swagger.json → copy to softwart-docs repo
```

---

## Tests

**Vitest + supertest — 24 tests total**

| Suite | Tests | Requires DB |
|---|---|---|
| `unit/installments.helper.test.ts` | 11 | No |
| `integration/auth.test.ts` | 8 | Yes |
| `integration/create-sale.test.ts` | 5 | Yes |

Integration tests use a separate `softwart_test` database with `dropSchema: true` for a clean slate on every run.

```bash
npm test                 # run all 24 tests
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled build (production) |
| `npm run seed` | Seed initial catalog data |
| `npm test` | Run all tests (24 total) |
| `npm run test:coverage` | Tests with coverage report |
| `npm run docs:export` | Export `swagger.json` for softwart-docs |
| `npm run backup` | Dump database to `backups/` |
| `npm run migration:generate` | Generate migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | List applied / pending migrations |

---

## Required environment variables

```env
# Production (Render)
DATABASE_URL=        # Supabase connection string
JWT_SECRET=          # Token signing secret (min 64 chars)
SMTP_USER=           # Gmail address for outgoing email
SMTP_PASS=           # Gmail app password
FRONTEND_URL=        # https://softwart.online (CORS)

# Development (local)
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

---

## Custom error hierarchy

```
AppError (base)
├── BadRequestError   400
├── UnauthorizedError 401
├── ForbiddenError    403
├── NotFoundError     404
├── ConflictError     409
└── ValidationError   422
```

All responses: `{ success: boolean, data?, message?, meta? }`

---

## Related repositories

- [frontend-softwart-2](https://github.com/SoftwArt/frontend-softwart-2) — React + TypeScript + Vite + Tailwind
- [mobile-softwart](https://github.com/SoftwArt/mobile-softwart) — Flutter + Clean Architecture
- [softwart-docs](https://github.com/SoftwArt/softwart-docs) — API docs (Redoc), C4 diagrams, MHU, SCRUM documentation

---

## Academic context

Capstone project — Technology in Software Analysis and Development, SENA (Medellín, Colombia).
Built by **Sergio E. León V.**

---

Built with AI-assisted development using [Claude](https://claude.ai) and [Claude Code](https://claude.ai/code) by Anthropic.
