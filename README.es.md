# SoftwArt — Backend

> 🌐 Also available in [English](./README.md)

API REST que impulsa **SoftwArt**, un sistema de gestión construido para Arte Café — una marquetería PYME en Medellín, Colombia. El negocio operaba completamente con registros físicos: agendas en papel, recibos a mano y acuerdos de pago verbales. Ese flujo generaba problemas reales — los clientes tenían que ir presencialmente para agendar, y la dueña enfrentaba conflictos frecuentes por pagos sin registro.

SoftwArt reemplaza todo eso. Cubre el ciclo completo del negocio desde el registro de clientes hasta el pago final, y expone una API REST consumida tanto por el panel web como por la app móvil Android.

🌐 **En producción:** [softwart.online](https://softwart.online)

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js + Express |
| Lenguaje | TypeScript |
| ORM | TypeORM |
| Base de datos | PostgreSQL (Supabase en producción) |
| Auth | JWT (8h) + bcrypt (salt 10) |
| Validación | Zod — middleware `validate(schema)`, 422 en fallo |
| Headers de seguridad | Helmet |
| Rate limiting | express-rate-limit |
| Email | nodemailer (Gmail SMTP) |
| API docs | OpenAPI 3.0 + Swagger UI (dev) / Redoc (prod) |
| Tests | Vitest + supertest (24 tests) |
| Deploy | Render |

---

## Arquitectura

Patrón **MVC estricto** con separación clara de responsabilidades:

```
src/
├── controllers/   — lógica de cada endpoint
├── models/        — entidades TypeORM (15 entidades)
├── routes/        — registro de rutas por módulo
├── middlewares/   — auth, cors, rate limit, validate, notFound
├── schemas/       — schemas Zod por dominio (auth, account, appointment, sale)
├── errors/        — jerarquía de errores custom (AppError → subtypes)
├── helpers/       — lógica de negocio reutilizable (cálculo de abonos)
├── services/      — email service (fire & forget)
├── seeds/         — datos iniciales del sistema
├── migrations/    — migraciones TypeORM (synchronize: false en prod)
├── docs/          — swagger.ts (spec OpenAPI 3.0)
├── tests/
│   ├── unit/        — installments.helper.test.ts
│   └── integration/ — auth.test.ts, create-sale.test.ts
├── app.ts         — setup de Express (exporta `app`)
└── server.ts      — bootstrap: init BD, seeds, listen
```

### Decisión de diseño: Usuario vs Cliente separados

`Usuario` (seguridad) y `Cliente` (negocio) son entidades **independientes**, vinculadas por correo sin FK directa. Esto permite que el sistema de auth evolucione sin acoplarse al modelo de negocio.

JWT payload: `{ id_usuario, correo, id_rol, rol, id_cliente }`

### Flujo de negocio principal

```
Clientes → Citas → Crear venta desde cita → Ventas → Abonos → Pedidos → Pagos
```

La creación de venta desde una cita es una **transacción atómica**: crea `Venta` + `DetalleVenta` y cambia el estado de la cita a `Completada` en una sola operación.

### Modelo de abonos flexible

- `num_abonos` (default: 2) y `porcentaje_primer_abono` (default: 70%)
- Abono 1 = `total × pct / 100`; intermedios = resto en partes iguales; último = saldo exacto
- La configuración se bloquea una vez que hay pagos registrados
- Al completar todos los abonos, la venta se marca como pagada automáticamente

---

## Entidades (15)

`Usuario` · `Rol` · `Permiso` · `PermisoRol` · `Cliente` · `Servicio` · `EstadoCita` · `EstadoServicio` · `MetodoPago` · `EstadoPago` · `Cita` · `Marco` · `Venta` · `DetalleVenta` · `Pago`

---

## Seguridad

| Mecanismo | Detalle |
|---|---|
| Helmet.js | Headers HTTP de seguridad (CSP, X-Frame-Options, HSTS) |
| JWT fail-fast | El servidor no arranca si `JWT_SECRET` no está definida |
| Validación Zod | 422 en todos los endpoints con body vía `validate(schema)` |
| Rate limiting | 100 req/15min general · 10 req/15min rutas auth |
| CORS | Solo `localhost:3000` y `softwart.online` |
| bcrypt | Salt rounds = 10 |
| RBAC | `requireRol()`, `requireCliente()`, `requirePermission()` |

---

## Endpoints principales

### Públicos — Auth

```
POST /api/auth/login
POST /api/auth/register              — también vincula a un Cliente invitado existente si el correo coincide
POST /api/auth/recover
POST /api/auth/reset-password
POST /api/auth/reenviar-codigo
GET  /api/auth/disponibilidad?fecha=YYYY-MM-DD   — público, solo slots ocupados (sin datos privados)
POST /api/auth/guest-appointment                 — público, crea Client+Cita atómicamente (sin cuenta)
POST /api/auth/register-guest                    — público, crea solo Client (sin User)
```

### Portal cliente (`verifyToken` + `requireCliente`)

```
GET    /api/account/perfil
PUT    /api/account/perfil
GET    /api/account/citas
POST   /api/account/citas
PATCH  /api/account/citas/:id/cancelar
GET    /api/account/disponibilidad?fecha=YYYY-MM-DD
GET    /api/account/servicios          — detalles de servicios con estado actual del cliente autenticado
DELETE /api/account
```

### Panel admin / empleado

```
POST  /api/appointments/:id/create-sale
GET   /api/sales/:id/payment-plan
POST  /api/sales/:id/installment
PATCH /api/sales/:id/configure-installments
```

Referencia completa: [softwart-docs](https://github.com/SoftwArt/softwart-docs) (Redoc, GitHub Pages)

---

## Correr localmente

```bash
git clone https://github.com/SoftwArt/softwart-backend
cd softwart-backend
npm install
cp .env.example .env   # completar DB_*, JWT_SECRET, SMTP_*, FRONTEND_URL
npm run seed
npm run dev            # → http://localhost:3001
```

### Con Docker

```bash
docker compose up --build
docker compose exec backend npm run seed   # solo la primera vez
docker compose down -v                     # reset completo
```

PostgreSQL 16 en `localhost:5432` (user/pass/db: `softwart`). Backend en `localhost:3001`.

---

## Documentación de la API

- **Dev**: Swagger UI en `http://localhost:3001/api/docs` — no expuesto en producción
- **Prod**: Redoc estático en [softwart-docs](https://github.com/SoftwArt/softwart-docs)

```bash
npm run docs:export   # genera swagger.json → copiar al repo softwart-docs
```

---

## Tests

**Vitest + supertest — 24 tests en total**

| Suite | Tests | Requiere BD |
|---|---|---|
| `unit/installments.helper.test.ts` | 11 | No |
| `integration/auth.test.ts` | 8 | Sí |
| `integration/create-sale.test.ts` | 5 | Sí |

Los tests de integración usan una BD separada `softwart_test` con `dropSchema: true` — tablas limpias en cada ejecución.

```bash
npm test                 # correr los 24 tests
npm run test:watch       # modo watch
npm run test:coverage    # con reporte de cobertura
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start` | Corre el build compilado (producción) |
| `npm run seed` | Carga datos iniciales de catálogo |
| `npm test` | Corre los 24 tests |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run docs:export` | Exporta `swagger.json` para softwart-docs |
| `npm run backup` | Exporta la BD a `backups/` |
| `npm run migration:generate` | Genera migración desde cambios en entidades |
| `npm run migration:run` | Aplica migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:show` | Lista migraciones aplicadas / pendientes |

---

## Variables de entorno requeridas

```env
# Producción (Render)
DATABASE_URL=        # Connection string de Supabase
JWT_SECRET=          # Clave para firmar tokens (mín. 64 chars)
SMTP_USER=           # Gmail para envío de correos
SMTP_PASS=           # App password de Gmail
FRONTEND_URL=        # https://softwart.online (CORS)

# Desarrollo (local)
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

---

## Jerarquía de errores

```
AppError (base)
├── BadRequestError   400
├── UnauthorizedError 401
├── ForbiddenError    403
├── NotFoundError     404
├── ConflictError     409
└── ValidationError   422
```

Todas las respuestas: `{ success: boolean, data?, message?, meta? }`

---

## Repositorios relacionados

- [frontend-softwart-2](https://github.com/SoftwArt/frontend-softwart-2) — React + TypeScript + Vite + Tailwind
- [mobile-softwart](https://github.com/SoftwArt/mobile-softwart) — Flutter + Clean Architecture
- [softwart-docs](https://github.com/SoftwArt/softwart-docs) — Docs API (Redoc), diagramas C4, MHU, documentación SCRUM

---

## Contexto académico

Proyecto de grado — Tecnología en Análisis y Desarrollo de Software, SENA (Medellín, Colombia).
Desarrollado por **Sergio E. León V.**

---

Desarrollado con AI-assisted development usando [Claude](https://claude.ai) y [Claude Code](https://claude.ai/code) de Anthropic.
