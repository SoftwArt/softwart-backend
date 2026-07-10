# Pruebas — SoftwArt Backend

Suite de pruebas con **Vitest** + **supertest**. Actualmente **25 pruebas** (11 unitarias + 14 de integración).

> ✅ **Se ejecutan en el CI** en cada push y PR (con un PostgreSQL efímero como *service container*).
> Una prueba fallida **bloquea el despliegue**.

---

## Cómo ejecutarlas

```bash
npm test              # las 24 pruebas
npm run test:watch    # modo watch (re-ejecuta al guardar)
npm run test:coverage # con reporte de cobertura
```

**Requisitos:** PostgreSQL local corriendo, con el usuario `softwart` y la base `softwart-db` existente
(desde ahí `setup.ts` crea `softwart_test`).

---

## Estructura

```
src/tests/
├── env.setup.ts                       ← configuración (NO es prueba)
├── setup.ts                           ← infraestructura (NO es prueba)
├── unit/
│   └── installments.helper.test.ts    ← 11 pruebas unitarias
└── integration/
    ├── auth.test.ts                   ← 8 pruebas de integración
    └── create-sale.test.ts            ← 6 pruebas de integración
```

### Archivos de soporte (no contienen pruebas)

| Archivo | Qué hace |
|---|---|
| `env.setup.ts` | Carga `.env.test` **antes de cualquier import** (`override: true`), para que las pruebas apunten a `softwart_test` y **nunca** a la BD real. |
| `setup.ts` | `beforeAll`: crea la BD `softwart_test` si no existe → inicializa TypeORM (con `dropSchema: true` en modo test, así las tablas quedan **limpias en cada corrida**) → ejecuta los **seeds**. |

Gracias a los seeds, antes de cada corrida existen: roles, permisos, estados (cita/servicio/pago),
métodos de pago, servicios y el usuario `admin@softwart.com`. Por eso las pruebas pueden autenticarse
como admin sin crearlo.

---

## Estrategia de pruebas

Se sigue la **pirámide de pruebas** con un enfoque **basado en riesgo**: no se busca cobertura
exhaustiva, sino cubrir los componentes de **mayor riesgo e impacto**.

| Se prueba | No se prueba (y por qué) |
|---|---|
| Lógica de negocio con casos límite | Código trivial (getters, mapeos simples) |
| Flujos críticos del sistema | Código de librerías (Express, TypeORM — ya viene probado) |
| Reglas de negocio e invariantes | Controllers en aislamiento: solo *orquestan*; probarlos con mocks probaría los mocks, no el código. Se cubren por **integración**. |

**Cobertura:** es una guía, no una meta. ~70–80 % es sano; buscar 100 % suele significar tiempo
gastado probando cosas triviales.

---

## Pruebas unitarias (11)

**`unit/installments.helper.test.ts`** — lógica pura del cálculo de abonos. **Sin BD, sin HTTP.**
Se eligió porque es la única pieza con matemática delicada (porcentajes, división del resto,
redondeo, último abono exacto).

### `calculateInstallments` (7)
1. Devuelve un solo abono cuando `num_abonos = 1`.
2. Divide correctamente en dos abonos (70 % / 30 %).
3. Numera los abonos secuencialmente desde 1.
4. El último abono cubre el saldo exacto (evita deriva por redondeo).
5. Reparte el resto en partes iguales entre los abonos intermedios (N > 2).
6. Limita `porcentaje_primer` a 99 cuando se pasa 100.
7. Limita `num_abonos` a 1 cuando se pasa 0.

### `nextInstallment` (4)
8. Devuelve el primer abono cuando no hay pagos.
9. Devuelve el último abono tras el primer pago.
10. Devuelve `null` cuando todos los abonos están pagados.
11. Devuelve `null` cuando los pagos exceden los abonos configurados.

---

## Pruebas de integración (13)

Usan **supertest**, que inyecta la app de Express (sin levantar un servidor) y lanza peticiones HTTP
reales a través de **toda la cadena**: Helmet → CORS → rate limit → Zod → controlador → TypeORM →
PostgreSQL. Por eso verifican que las piezas funcionan **juntas**.

### `integration/auth.test.ts` (8)

**`POST /api/auth/login`**
1. `200` + token con credenciales válidas de admin (verifica `success`, `token`, `correo`, `rol`).
2. `401` con contraseña incorrecta.
3. `401` con correo inexistente.
4. `422` cuando falta `clave` (validación Zod).

**`POST /api/auth/register`**
5. `201` crea un usuario cliente nuevo.
6. `409` cuando el correo ya está registrado.
7. `422` cuando faltan campos requeridos (validación Zod).
8. `200` el usuario recién registrado puede iniciar sesión con rol `Cliente`.

> **Nota:** estas pruebas **comparten estado** dentro del archivo y dependen del orden (la #6 requiere
> que la #5 haya creado el usuario). Vitest ejecuta los tests de un archivo secuencialmente, así que
> funciona. Lo "puro" sería que cada prueba fuese independiente.

### `integration/create-sale.test.ts` (6)

`beforeAll` prepara el escenario: se autentica como admin (obtiene el JWT), crea un cliente de prueba
y **tres citas** (dos `Completada`, una `Pendiente`), y toma un servicio sembrado.

> **Regla de negocio:** solo se puede facturar una cita que **ya ocurrió** (`Completada`, `id = 2`).
> El controlador rechaza con `409` cualquier otra (`AppointmentController.createSaleFromAppointment`).

**`POST /api/appointments/:id/create-sale`**
1. `201` crea la venta + sus detalles desde una cita `Completada`.
   **Además consulta la BD** para comprobar los efectos: la cita sigue `Completada` y la venta existe
   con el total correcto → demuestra que la **transacción atómica** funcionó.
2. `409` cuando la cita **no está Completada** (cubre el guard de la regla de negocio).
3. `409` cuando la cita ya tiene una venta asociada.
4. `404` cuando la cita no existe.
5. `401` sin token de autenticación.
6. `422` cuando el arreglo `servicios` viene vacío (validación Zod).

**Autenticación en pruebas:**
```typescript
adminToken = (await request(app).post("/api/auth/login").send({...})).body.token;
// ...
.set("Authorization", `Bearer ${adminToken}`)
```

---

## Tipos de prueba cubiertos

| Tipo | Estado | Dónde |
|---|---|---|
| **Estáticas** (análisis estático) | ✅ | CI: `tsc --noEmit`, ESLint, `npm audit` |
| **Unitarias** | ✅ | `unit/installments.helper.test.ts` (11) |
| **Integración** | ✅ | `integration/auth.test.ts` (8), `integration/create-sale.test.ts` (6) |
| **No funcionales** (rendimiento, carga) | ❌ pendiente | — |

> Las **pruebas estáticas** (type-check, lint, auditoría) analizan el código **sin ejecutarlo**;
> las **dinámicas** (unitarias, integración) sí lo ejecutan. Ambas son parte del aseguramiento de calidad.

---

## Ejecución en el CI ✅

`.github/workflows/ci.yml` levanta un **PostgreSQL 16 efímero** (*service container*) y ejecuta
`npm test` después del type-check, el lint y la auditoría. Vitest descubre solo cualquier
`*.test.ts`, así que **las pruebas futuras se incluyen sin tocar el workflow**.

Variables inyectadas en el CI: `NODE_ENV=test`, `DB_*`, `JWT_SECRET`, `FRONTEND_URL` y un
`RESEND_API_KEY` ficticio (**necesario**: `new Resend(undefined)` lanza al importar `email.service`;
las pruebas no envían correos). `ADMIN_EMAIL`/`ADMIN_PASSWORD` se omiten a propósito para que el seed
use sus valores por defecto, que son los que esperan las pruebas.

### Dos hallazgos al integrar las pruebas al CI
1. **Dependencia oculta del entorno:** los tests pasaban en local porque `dotenv` cargaba el `.env` de
   desarrollo (con `RESEND_API_KEY`). En el CI no existe ese archivo y el fallo salió a la luz.
2. **Prueba obsoleta:** `create-sale` llevaba meses fallando en silencio. Se añadió el guard
   "solo se factura una cita Completada" **después** de escribir la prueba, y nadie la actualizó
   porque las pruebas **solo corrían localmente**. Ahora está corregida y el guard tiene su propia prueba.

---

## Pendientes / mejoras de alto valor

- [ ] **Prueba de IDOR:** que un cliente no pueda cancelar la cita de otro (valida el control A01).
- [ ] **Prueba de anular venta en cascada:** `409` si hay pagos `Validado`; si no, cancela detalles y
      anula abonos pendientes.
- [ ] Limpiar `.env.test`: aún tiene `SMTP_USER` / `SMTP_PASS`, restos de la época de Nodemailer
      (hoy se usa Resend). No se leen en ninguna parte.
