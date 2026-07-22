# Pruebas — SoftwArt Backend

Suite de pruebas con **Vitest** + **supertest**. Actualmente **99 pruebas** (11 unitarias + 88 de integración).

> ✅ **Se ejecutan en el CI** en cada push y PR (con un PostgreSQL efímero como *service container*).
> Una prueba fallida **bloquea el despliegue**.

---

## Cómo ejecutarlas

```bash
npm test              # las 36 pruebas
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
    ├── auth.test.ts                        ← 8 pruebas de integración
    ├── create-sale.test.ts                 ← 6 pruebas de integración
    ├── account-idor.test.ts                ← 6 pruebas de integración (control de acceso)
    ├── void-sale.test.ts                    ← 5 pruebas de integración (cascada transaccional)
    ├── cancel-appointment-with-sale.test.ts ← 17 pruebas (cascada cita↔venta + hard-delete Venta/Cita)
    ├── permission-guard.test.ts             ← 6 pruebas (control de acceso real por permiso)
    ├── payment-guards.test.ts               ← 9 pruebas (guards de negocio de Pago)
    ├── appointment-guards.test.ts           ← 4 pruebas (doble-reserva + límite anti-DoS de Citas)
    └── (otros: cancel-appointment-guard, legal-acceptance-immutability, refresh-token —
        pendientes de documentar acá, no forman parte de esta actualización)
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

## Pruebas de integración (25)

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

### `integration/account-idor.test.ts` (6)

Evidencia ejecutable del control **OWASP A01 — Broken Access Control**, variante **IDOR**
(*Insecure Direct Object Reference*).

`beforeAll` registra **dos clientes reales** (A y B) vía `POST /api/auth/register`, inicia sesión con
cada uno y crea tres citas de **A** directamente en la BD.

> **El riesgo:** el `:id` de la cita lo escribe el atacante en la URL. Si el backend confía en él,
> el cliente B puede cancelar las citas de A. El guard compara `cita.client.id_cliente` contra el
> `id_cliente` del **JWT**, no contra la URL.

**`PATCH /api/account/citas/:id/cancelar`**
1. `403` cuando el cliente **B** intenta cancelar una cita del cliente **A** (IDOR).
   **Además consulta la BD** para comprobar que la cita sigue `Pendiente` → el guard no solo responde
   403, tampoco produce efectos.
2. `403` para un **admin** (su token trae `id_cliente: null` → lo frena `requireCliente`).
3. `401` sin token de autenticación.
4. `404` cuando la cita no existe.
5. `400` cuando la cita no está `Pendiente` (no se cancela una `Completada`).
6. `200` el **dueño** sí cancela su cita → en BD queda `Cancelada` (`id = 4`).

> **Verificado por mutación:** se desactivó temporalmente el guard de propiedad y la prueba #1 falló
> con `expected 200 to be 403` — es decir, sin el control el ataque **funciona**. Una prueba que pasa
> igual con y sin la protección no prueba nada; esta sí la detecta.

**Diferencia entre los dos 403** (#1 y #2) — se prueban por separado a propósito:

| | Control | Pregunta que responde |
|---|---|---|
| #2 | **RBAC** (vertical) | ¿*Este rol* puede usar este endpoint? |
| #1 | **IDOR** (horizontal) | ¿Este usuario es *dueño de este recurso*? |

### `integration/void-sale.test.ts` (5)

Cubre la **transacción en cascada** al anular una venta. `beforeAll` siembra dos ventas activas:
una con un servicio `Sin empezar` + uno `Finalizado` y un abono `Pendiente`; otra con un pago `Validado`.

**`PATCH /api/sales/:id/estado`**
1. `409` cuando la venta tiene un pago `Validado` (hubo dinero real → corresponde una **devolución**,
   no una anulación). Verifica en BD que **nada** cambió: ni la venta, ni el detalle, ni el pago.
2. `200` anula y **cae en cascada**: el detalle `Sin empezar` → `Cancelado`, el abono `Pendiente` →
   `Anulado`, y el detalle `Finalizado` **queda intacto**. Comprueba también los contadores de la
   respuesta (`serviciosCancelados: 1`, `abonosAnulados: 1`).
3. `200` reactivar es un **toggle simple**: la venta vuelve a `Activo` pero la cascada **no se deshace**
   (los estados terminales `Cancelado`/`Anulado` se conservan por trazabilidad).
4. `404` cuando la venta no existe.
5. `401` sin token de autenticación.

> Las pruebas #2 y #3 **dependen del orden** (la #3 reactiva la venta que anuló la #2). Vitest ejecuta
> los tests de un archivo secuencialmente.

### `integration/cancel-appointment-with-sale.test.ts` (17)

Además de la cascada cita↔venta original, cubre el **hard-delete** de `Venta` y `Cita` — excepción
deliberada a "sin hard-delete en ventas" (ver `CLAUDE.md`): una Venta sin abonos `Validado` sí puede
borrarse por completo, cascadeando `SaleDetail`/`Payment`.

**`DELETE /api/sales/:id`**
1. `200` elimina la Venta cuando no tiene abonos validados (0 o solo `Pendiente`).
2. `409` y no borra nada si tiene un abono `Validado`.
3. `DELETE /api/sale-details/:id` y `DELETE /api/payments/:id` siguen sin existir (`404`) — esos
   nunca se borran duro, solo la Venta.

**`DELETE /api/appointments/:id`** (mismo criterio, cascadeando también la Venta asociada)
4. `200` elimina una cita sin venta directamente.
5. `200` elimina la cita y cascadea su Venta cuando no tiene abonos validados.
6. `409` y no borra nada si la Venta tiene un abono `Validado`.
7. `404` cuando la cita no existe.

### `integration/permission-guard.test.ts` (6)

Evidencia ejecutable de que **`requirePermission`** (el middleware que reemplazó `requireRol("Admin")`
en casi todas las rutas) valida contra la tabla `permiso_rol` de verdad, no solo por nombre de rol.
`beforeAll` crea un rol nuevo sin ningún permiso y un usuario con ese rol.

1. `403` en un módulo sin permiso asignado (`CLIENTES.VER`).
2. `403` en `/api/dashboard` mientras no tenga `PANEL.ACCESO`.
3. `200` en el mismo módulo en cuanto se le asigna el permiso — **sin volver a loguearse** (el
   middleware consulta la BD en cada request, no lee permisos del JWT).
4. `403` en un módulo distinto aunque ya tenga otro permiso — confirma que es granular, no todo-o-nada.
5. `200` en `/api/dashboard` en cuanto se le asigna `PANEL.ACCESO`.
6. `401` sin token de autenticación.

### `integration/payment-guards.test.ts` (9)

Guards de negocio de `Pago` agregados este sprint: `id_venta` obligatorio, límite de `num_abonos`,
venta anulada, y los guards de estado terminal/transición única que Cita y Servicio ya tenían probados.

1. `422` al crear un Pago sin `id_venta` (validación Zod).
2. `409` al crear un Pago cuando ya se alcanzaron los abonos configurados.
3. Los pagos `Anulado` no cuentan para ese límite.
4. `409` (`createPayment` y `registerInstallment`) si la Venta está anulada (`estado=false`).
5. `409` al editar (`PUT`) un Pago ya `Anulado`, y no cambia nada.
6. `409` si un pago `Validado` intenta ir a un estado que no sea `Anulado`; `200` si va a `Anulado`.
7. `409` si se intenta cambiar el estado de un pago ya `Anulado`.

### `integration/appointment-guards.test.ts` (4)

1. `409` al agendar (sin cuenta) el mismo horario ya ocupado por otro cliente.
2. Cancelar una cita **libera el slot** para volver a agendarlo (antes no lo hacía: el guard viejo no
   excluía citas `Cancelada`/`No Asistió`).
3. El panel admin (`POST /api/appointments`) respeta el mismo guard que "agendar sin cuenta".
4. El límite anti-DoS de citas activas por cliente (3) se respeta; la 4ª cita agendada da `409`.

---

## Tipos de prueba cubiertos

| Tipo | Estado | Dónde |
|---|---|---|
| **Estáticas** (análisis estático) | ✅ | CI: `tsc --noEmit`, ESLint, `npm audit` |
| **Unitarias** | ✅ | `unit/installments.helper.test.ts` (11) |
| **Integración** | ✅ | `auth` (8), `create-sale` (6), `account-idor` (6), `void-sale` (5) |
| **Seguridad** (control de acceso) | ✅ | `integration/account-idor.test.ts` — RBAC + IDOR (OWASP A01) |
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

- [x] **Prueba de IDOR:** que un cliente no pueda cancelar la cita de otro (valida el control A01).
- [x] **Prueba de anular venta en cascada:** `409` si hay pagos `Validado`; si no, cancela detalles y
      anula abonos pendientes.
- [x] Limpiar `.env.test` (restos de `SMTP_*` de la época de Nodemailer) y añadirle un
      `RESEND_API_KEY` ficticio, para que **local espeje al CI** y las pruebas no dependan de que
      exista un `.env` de desarrollo.
- [ ] **Pruebas no funcionales / de rendimiento** (p. ej. `autocannon` o `k6` contra los endpoints
      de listado) — el único tipo de prueba que aún no está cubierto.
