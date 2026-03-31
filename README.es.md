# SoftwArt — Backend

> 🌐 Also available in [English](./README.md)

API REST que impulsa **SoftwArt**, un sistema de gestión construido para Arte Café — una marquetería PYME en Medellín, Colombia. El negocio operaba completamente con registros físicos: agendas en papel, recibos a mano y acuerdos de pago verbales. Ese flujo generaba problemas reales — los clientes tenían que ir presencialmente para agendar o ver cómo podría quedar su trabajo, y la dueña enfrentaba conflictos frecuentes por pagos mal manejados y pedidos sin seguimiento.

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
| Rate limiting | express-rate-limit |
| Email | nodemailer (Gmail SMTP) |
| Deploy | Render |

---

## Arquitectura

Patrón **MVC estricto** con separación clara de responsabilidades:

```
src/
├── controllers/   — lógica de cada endpoint
├── models/        — entidades TypeORM (15 entidades)
├── routes/        — registro de rutas por módulo
├── middlewares/   — auth, cors, rate limit, notFound
├── errors/        — jerarquía de errores custom (AppError → subtypes)
├── helpers/       — lógica de negocio reutilizable (ej: cálculo de abonos)
├── services/      — email service (fire & forget)
└── seeds/         — datos iniciales del sistema
```

### Decisión de diseño: Usuario vs Cliente separados

`Usuario` (seguridad) y `Cliente` (negocio) son entidades **independientes**, vinculadas por correo sin FK directa. Esto permite que el sistema de autenticación evolucione sin acoplarse al modelo de negocio, y que existan usuarios administrativos sin ser clientes del sistema.

JWT payload: `{ id_usuario, correo, id_rol, rol, id_cliente }`

### Flujo de negocio principal

```
Clientes → Citas → Crear venta desde cita → Ventas → Abonos → Pedidos → Pagos
```

La creación de venta desde una cita es una **transacción atómica**: crea `Venta` + `DetalleVenta` y cambia el estado de la cita a `Completada` en una sola operación.

### Modelo de abonos flexible

Cada venta configura su propio plan de pago:
- `num_abonos` (default: 2) y `porcentaje_primer_abono` (default: 70%)
- Abono 1 = `total × pct / 100`; intermedios = resto en partes iguales; último = saldo exacto
- La configuración se bloquea automáticamente una vez que hay pagos registrados
- Al completar todos los abonos, la venta se marca como pagada automáticamente

---

## Entidades (15)

`Usuario` · `Rol` · `Permiso` · `PermisoRol` · `Cliente` · `Servicio` · `EstadoCita` · `EstadoServicio` · `MetodoPago` · `EstadoPago` · `Cita` · `Marco` · `Venta` · `DetalleVenta` · `Pago`

---

## Middlewares

| Middleware | Descripción |
|---|---|
| `generalLimiter` | 100 req / 15 min |
| `authLimiter` | 10 req / 15 min (solo rutas auth) |
| `verifyToken` | Verifica JWT, inyecta `req.user` |
| `requireRol(...roles)` | Control de acceso por rol |
| `requireCliente` | Verifica que el token tenga `id_cliente` |

---

## Endpoints principales

### Públicos — Auth
```
POST /api/auth/login
POST /api/auth/registro
POST /api/auth/recuperar
POST /api/auth/reset
```

### Portal cliente (`verifyToken` + `requireCliente`)
```
GET    /api/cuenta/perfil
PUT    /api/cuenta/perfil
GET    /api/cuenta/citas
POST   /api/cuenta/citas
PATCH  /api/cuenta/citas/:id/cancelar
GET    /api/cuenta/disponibilidad?fecha=YYYY-MM-DD
DELETE /api/cuenta
```

### Panel admin/empleado
```
POST  /api/citas/:id/crear-venta
GET   /api/ventas/:id/estado-pagos
POST  /api/ventas/:id/abono
PATCH /api/ventas/:id/configurar-abonos
```

---

## Correr localmente

```bash
# 1. Clonar e instalar
git clone https://github.com/selvcebo/softwart-backend
cd softwart-backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Completar: DATABASE_URL, JWT_SECRET, SMTP_USER, SMTP_PASS

# 3. Ejecutar seeds (datos iniciales)
npx ts-node src/seeds/index.ts

# 4. Correr en desarrollo
npm run dev
# → http://localhost:3001
```

### Variables de entorno requeridas

```env
DATABASE_URL=        # PostgreSQL connection string
JWT_SECRET=          # Clave para firmar tokens
SMTP_USER=           # Gmail para envío de correos
SMTP_PASS=           # App password de Gmail
```

---

## Errores custom

El sistema usa una jerarquía propia para respuestas consistentes:

```
AppError (base)
├── BadRequestError   400
├── UnauthorizedError 401
├── ForbiddenError    403
├── NotFoundError     404
├── ConflictError     409
└── ValidationError   422
```

Todas las respuestas siguen el formato: `{ success: boolean, data?, message?, meta? }`

---

## Repositorios relacionados

- [softwart-frontend](https://github.com/selvcebo/softwart-frontend) — React + TypeScript + Vite + Tailwind
- [softwart-mobile](https://github.com/selvcebo/softwart-mobile) — Flutter + Clean Architecture

---

## Contexto académico

Proyecto de grado — Tecnología en Análisis y Desarrollo de Software, SENA (Medellín, Colombia).
Desarrollado por **Sergio E. León V.**
