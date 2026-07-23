# Pruebas — SoftwArt Backend

Suite de pruebas con **Vitest** + **supertest**. Actualmente **128 pruebas** (11 unitarias + 117 de integración).

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
    ├── sale-detail-cascade.test.ts          ← 8 pruebas (cascada hacia arriba: PUT genérico + PATCH dedicado)
    ├── user-duplicate-email.test.ts         ← 4 pruebas (correo duplicado al crear/editar Usuario)
    ├── user-admin-base-guard.test.ts        ← 5 pruebas (updateUser protege correo/rol del admin base)
    ├── role-structural-guard.test.ts        ← 12 pruebas (Admin/Cliente: no renombrar/eliminar/desactivar
    │                                            + mensaje de asociados con concordancia correcta)
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

### `integration/sale-detail-cascade.test.ts` (8)

Cubre `isLastActiveDetail`/`voidSaleCascade` (`saleCascade.helper.ts`) en los **dos** endpoints que
pueden cancelar un `DetalleVenta` — mismo patrón que `cancel-appointment-with-sale.test.ts`.

**`PUT /api/sale-details/:id`** (CRUD genérico) — puede cambiar `id_estado` a `Cancelado` igual que
el PATCH dedicado, pero solo este último replicaba la cascada hacia arriba hasta este cambio (hueco
de defensa en profundidad, cerrado en `SaleDetailController.updateSaleDetail`).
1. `409` si es el último servicio activo y la Venta tiene un pago `Validado` — no cambia nada.
2. `200` cancela el detalle y **cascadea**: anula la Venta y sus abonos `Pendiente`.
3. El detalle `Cancelado` queda terminal — un `PUT` posterior es `409`.

**`PATCH /api/service-status/detalle/:id_detalle/estado`** (endpoint dedicado, `changeSaleDetailStatus`)
— el camino original de la cascada; nunca se había probado que el caso exitoso funcionara de punta a punta.
4. `409` si es el último servicio activo y la Venta tiene un pago `Validado` — no cambia nada.
5. `200` cancela el detalle y **cascadea**: anula la Venta y sus abonos `Pendiente`.

**Solo cascadea al cancelar el ÚLTIMO servicio activo** (no en cualquier cancelación):
6. Cancelar el único servicio activo cascadea aunque haya un hermano `Finalizado` ya intacto (no se toca).
7. Con **dos** servicios activos, cancelar uno **no cascadea** — la Venta y el otro servicio quedan igual.
8. Cancelar el segundo (ahora el último activo) sí cascadea.

> **Bug real encontrado al escribir esta prueba:** el alias que evita "cancelar dos veces" (`sale.
> saleDetails[idx] = target/item`) crea una referencia circular real (`item → sale → saleDetails →
> item`) que rompe `res.json()` con `500 Converting circular structure to JSON`. Existía también en
> `changeSaleDetailStatus` (el PATCH), pero **nunca se había probado ese camino exitoso** ahí tampoco —
> por eso la prueba #5 de arriba lo habría detectado. Se corrigió en ambos controllers omitiendo `sale`
> de la respuesta (`const { sale, ...resto } = item`).

### `integration/user-duplicate-email.test.ts` (4)

Ni Zod ni `UserController` (`createUser`/`updateUser`) validaban correo duplicado — el único guard era
el `unique` de la columna `correo` en BD (`User.ts`), que ante un duplicado devuelve un **500 crudo de
Postgres** en vez de un `409` legible. Mismo criterio que `ClientController` ya aplicaba para
documento/correo: `findOne` previo + `409` explícito antes del `save`.

1. `POST /api/users` → `409` si el correo ya pertenece a otro usuario; no crea un segundo registro.
2. `POST /api/users` → `201` normal si el correo está libre.
3. `PUT /api/users/:id` → `409` si intenta cambiar a un correo que ya tiene otro usuario; no cambia nada.
4. `PUT /api/users/:id` → `200` si el `correo` enviado es el mismo que ya tenía (no se compara contra
   sí mismo).

### `integration/user-admin-base-guard.test.ts` (5)

`deleteUser`/`toggleUserStatus` ya protegen al admin base (`SEED_ADMIN_ID`) — `updateUser` no
replicaba la misma protección: se podía cambiar su correo o su rol vía `PUT /api/users/:id`, lo que
equivale a un bloqueo de acceso encubierto (deja de poder loguearse, o pierde los permisos de Admin).
La clave sí se puede rotar — eso no compromete la cuenta protegida. Mismo criterio ya usado en
`RoleController.updateRole` para roles estructurales (bloquea el campo puntual, no el update entero).

1. `403` al intentar cambiar el correo del admin base — no cambia nada.
2. `403` al intentar cambiar el rol del admin base — no cambia nada.
3. `200` si se manda el mismo correo/rol que ya tenía (no se compara contra sí mismo).
4. `200` al rotar solo la clave del admin base — y la nueva clave sirve para loguearse.
5. Un usuario que **no** es el admin base sigue pudiendo cambiar correo y rol libremente (el guard es
   específico de `SEED_ADMIN_ID`, no un bloqueo general).

### `integration/role-structural-guard.test.ts` (12)

`esRolEstructural` (`RoleController.ts`) ya bloqueaba renombrar/eliminar/desactivar `Admin`/`Cliente`
desde una sesión anterior — pero **ningún test lo ejercitaba**. Estos roles se identifican por
**nombre** (comparación de texto), no por un id fijo: renombrar "Admin" los dejaría irreconocibles
para `deleteRole`/`toggleRoleStatus`/`updateRole` y perdería toda la protección.

**`PUT /api/roles/:id`**
1. `403` al intentar renombrar Admin — no cambia nada.
2. `403` al intentar renombrar Cliente.
3. `200` si se manda el mismo nombre que ya tenía, sin importar mayúsculas (`"admin"` vs `"Admin"`).
4. `200` editando solo la `descripcion` de Admin (el bloqueo es específico del campo `nombre`).
5. Un rol no estructural sí puede renombrarse libremente.

**`DELETE /api/roles/:id` y `PATCH /api/roles/:id/estado`**
6. `403` eliminando Admin.
7. `403` eliminando Cliente.
8. `403` desactivando Admin — su `estado` no cambia.
9. `403` desactivando Cliente.

**`DELETE /api/roles/:id` — mensaje de asociados (permiso/usuario) con concordancia correcta**

El mensaje crudo anterior era literal: `existen PermisoRol asociados (1)` — nombre técnico de la
entidad, sin concordar singular/plural. Ya estaba reemplazado por `enviarNoEliminarAsociados`
(`deleteGuard.helper.ts`), pero **ningún test confirmaba el texto real** que llega al toast — y al
escribir esta prueba salió a la luz un bug real: `permisoRolRepo.count({ where: { role: { id_rol } } })`
tira **500** siempre (no solo con datos), porque `RolePermission` tiene clave compuesta
(`permission`/`role`, ambos `@PrimaryColumn`) y el `where` anidado de TypeORM liga el objeto completo en
vez del id, generando SQL inválido. Se corrigió con `createQueryBuilder`, mismo patrón que ya usaba
`RolePermissionController`.

10. `409` con singular correcto (`"existe 1 permiso asociado..."`) cuando el rol tiene un permiso
    asignado — sin la palabra "PermisoRol" en el mensaje; el rol no se borra.
11. `409` con plural correcto (`"existen 2 permisos asociados..."`) con dos permisos asignados.
12. `409` con el mensaje de usuario asociado (`"existe 1 usuario asociado..."`) cuando el rol tiene un
    usuario asignado.

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
