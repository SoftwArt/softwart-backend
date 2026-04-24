# SoftwArt — Backend

> 🇨🇴 También disponible en [español](./README.es.md)

REST API powering **SoftwArt**, a business management system built for Arte Café — a framing and marquetry shop in Medellín, Colombia. The business previously relied entirely on physical records: paper agendas, handwritten receipts, and verbal payment agreements. That workflow caused real problems — customers had to visit in person just to book an appointment or see what their finished piece might look like, and the owner dealt with constant disputes over payments and orders with no paper trail to back her up.

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
| Security headers | Helmet |
| Rate limiting | express-rate-limit |
| Email | nodemailer (Gmail SMTP) |
| Deploy | Render |

---

## Architecture

Strict **MVC pattern** with clear separation of concerns:

```
src/
├── controllers/   — endpoint logic
├── models/        — TypeORM entities (15 total)
├── routes/        — per-module route registration
├── middlewares/   — auth, cors, rate limiting, 404 handler
├── errors/        — custom error hierarchy (AppError → subtypes)
├── helpers/       — reusable business logic (e.g. installment calculation)
├── services/      — email service (fire & forget)
└── seeds/         — initial system data
```

### Design decision: Usuario vs Cliente as separate entities

`Usuario` (authentication) and `Cliente` (business domain) are **independent entities**, linked by email address without a direct foreign key. This keeps the auth system decoupled from the business model — admin users can exist without being customers, and the auth layer can evolve independently.

JWT payload: `{ id_usuario, correo, id_rol, rol, id_cliente }`

### Core business flow

```
Clients → Appointments → Convert to sale → Sales → Installments → Orders → Payments
```

Converting an appointment into a sale is an **atomic transaction**: it creates `Venta` + `DetalleVenta` records and updates the appointment status to `Completada` in a single operation.

### Flexible installment model

Each sale configures its own payment plan:

- `num_abonos` (default: 2) and `porcentaje_primer_abono` (default: 70%)
- First installment = `total × pct / 100`; middle installments split the remainder equally; last installment = exact remaining balance
- Plan configuration is locked once any payment has been registered
- Sale is automatically marked as paid when all installments are completed

---

## Entities (15)

`Usuario` · `Rol` · `Permiso` · `PermisoRol` · `Cliente` · `Servicio` · `EstadoCita` · `EstadoServicio` · `MetodoPago` · `EstadoPago` · `Cita` · `Marco` · `Venta` · `DetalleVenta` · `Pago`

---

## Middleware

| Middleware               | Description                           |
| ------------------------ | ------------------------------------- |
| `generalLimiter`       | 100 req / 15 min                      |
| `authLimiter`          | 10 req / 15 min (auth routes only)    |
| `verifyToken`          | Validates JWT, injects `req.user`   |
| `requireRol(...roles)` | Role-based access control             |
| `requireCliente`       | Verifies token carries `id_cliente` |

---

## Key endpoints

### Public — Auth

```
POST /api/auth/login
POST /api/auth/registro
POST /api/auth/recuperar
POST /api/auth/reset
```

### Client portal (`verifyToken` + `requireCliente`)

```
GET    /api/cuenta/perfil
PUT    /api/cuenta/perfil
GET    /api/cuenta/citas
POST   /api/cuenta/citas
PATCH  /api/cuenta/citas/:id/cancelar
GET    /api/cuenta/disponibilidad?fecha=YYYY-MM-DD
DELETE /api/cuenta
```

### Admin / employee panel

```
POST  /api/citas/:id/crear-venta
GET   /api/ventas/:id/estado-pagos
POST  /api/ventas/:id/abono
PATCH /api/ventas/:id/configurar-abonos
```

---

## Running locally

```bash
# 1. Clone and install
git clone https://github.com/selvcebo/softwart-backend
cd softwart-backend
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, SMTP_USER, SMTP_PASS

# 3. Seed initial data
npm run seed

# 4. Start dev server
npm run dev
# → http://localhost:3001
```

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled build (production) |
| `npm run seed` | Seed initial catalog data |
| `npm run backup` | Dump database to `backups/` (requires PostgreSQL client tools) |
| `npm run migration:generate` | Generate migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | List applied / pending migrations |

### Required environment variables

```env
# Production (Render)
DATABASE_URL=        # Supabase connection string
JWT_SECRET=          # Token signing secret (min 64 chars)
SMTP_USER=           # Gmail address for outgoing email
SMTP_PASS=           # Gmail app password
FRONTEND_URL=        # https://softwart.online (CORS)

# Development (local)
DB_HOST=             # e.g. localhost
DB_PORT=             # e.g. 5432
DB_USER=
DB_PASSWORD=
DB_NAME=
```

---

## Custom error hierarchy

Consistent error responses across the entire API:

```
AppError (base)
├── BadRequestError   400
├── UnauthorizedError 401
├── ForbiddenError    403
├── NotFoundError     404
├── ConflictError     409
└── ValidationError   422
```

All responses follow the format: `{ success: boolean, data?, message?, meta? }`

---

## Related repositories

- [softwart-frontend](https://github.com/selvcebo/softwart-frontend) — React + TypeScript + Vite + Tailwind
- [softwart-mobile](https://github.com/selvcebo/softwart-mobile) — Flutter + Clean Architecture

---

## Academic context

Capstone project — Technology in Software Analysis and Development, SENA (Medellín, Colombia).
Built by **Sergio E. León V.**

---

## Development tools

Built with AI-assisted development using [Claude](https://claude.ai) and [Claude Code](https://claude.ai/code) by Anthropic.
