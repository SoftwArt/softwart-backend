import { z } from "zod";
import { claveSchema, telefonoSchema, nombreSchema, validarDocumentoPorTipo } from "./auth.schemas";
import { textoRequerido, idPositivo, numeroPositivo } from "./common.schemas";

// ── Catálogos de nombre único ──────────────────────────────────────────────
const nombreCatalogo = (etiqueta: string) => z.object({ nombre: textoRequerido(etiqueta) });
const nombreCatalogoOpt = (etiqueta: string) => z.object({ nombre: textoRequerido(etiqueta).optional() });

export const createPaymentMethodSchema     = nombreCatalogo("El nombre del método de pago");
export const updatePaymentMethodSchema     = nombreCatalogoOpt("El nombre del método de pago");
export const createPaymentStatusSchema     = nombreCatalogo("El nombre del estado de pago");
export const updatePaymentStatusSchema     = nombreCatalogoOpt("El nombre del estado de pago");
export const createServiceStatusSchema     = nombreCatalogo("El nombre del estado de servicio");
export const updateServiceStatusSchema     = nombreCatalogoOpt("El nombre del estado de servicio");
export const createAppointmentStatusSchema = nombreCatalogo("El nombre del estado de cita");
export const updateAppointmentStatusSchema = nombreCatalogoOpt("El nombre del estado de cita");
export const createRoleSchema = z.object({
  nombre:      textoRequerido("El nombre del rol"),
  descripcion: z.string().optional(),
});
export const updateRoleSchema = createRoleSchema.partial();

// ── PATCH: asignación de FK a otra entidad ────────────────────────────────
export const assignPaymentMethodSchema     = z.object({ id_metodo_pago:  idPositivo("El método de pago") });
export const changePaymentStatusSchema     = z.object({ id_estado_pago:  idPositivo("El estado del pago") });
export const changeSaleDetailStatusSchema  = z.object({ id_estado:       idPositivo("El estado del servicio") });
export const changeAppointmentStatusSchema = z.object({ id_estado_cita:  idPositivo("El estado de la cita") });

// ── Client ────────────────────────────────────────────────────────────────
// La única forma de que un Cliente tenga cuenta de Usuario es el autorregistro
// público (POST /api/auth/register) — ahí sí queda la aceptación digital de
// ToS/PyP del propio titular. El panel admin solo administra la ficha del
// Cliente (sin cuenta), nunca crea acceso al portal en su nombre.
const clientShape = z.object({
  tipoDocumento: textoRequerido("El tipo de documento"),
  documento:     textoRequerido("El número de documento"),
  nombre:        nombreSchema,
  correo:        z.string({ error: "El correo es requerido" }).email("Correo inválido"),
  telefono:      telefonoSchema.optional(),
});

export const createClientSchema = clientShape.superRefine((data, ctx) => {
  const msg = validarDocumentoPorTipo(data.tipoDocumento, data.documento);
  if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["documento"] });
});

// .partial(): en edición solo se valida el documento si vinieron AMBOS
// campos juntos (el CRUD siempre los manda juntos; otros consumidores de la
// API podrían mandar solo uno para actualizar el otro campo aparte).
export const updateClientSchema = clientShape.partial().superRefine((data, ctx) => {
  if (data.tipoDocumento === undefined || data.documento === undefined) return;
  const msg = validarDocumentoPorTipo(data.tipoDocumento, data.documento);
  if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["documento"] });
});

// ── Frame ─────────────────────────────────────────────────────────────────
export const createFrameSchema = z.object({
  codigo:            textoRequerido("El código"),
  colilla:           idPositivo("La colilla", true),
  precio_ensamblado: numeroPositivo("El precio ensamblado"),
});
export const updateFrameSchema = createFrameSchema.partial();

// ── Permission ────────────────────────────────────────────────────────────
export const createPermissionSchema = z.object({
  nombre:      textoRequerido("El nombre del permiso"),
  descripcion: textoRequerido("La descripción del permiso", true),
});
export const updatePermissionSchema = createPermissionSchema.partial();

// ── RolePermission ────────────────────────────────────────────────────────
export const rolePermissionSchema = z.object({
  id_permiso: idPositivo("El permiso"),
  id_rol:     idPositivo("El rol"),
});

// ── Payment ───────────────────────────────────────────────────────────────
// id_venta es obligatorio: un Pago sin Venta se salta por completo los guards
// de negocio del controller (límite de num_abonos, venta anulada) — todos
// están condicionados a `req.body.id_venta !== undefined`.
export const createPaymentSchema = z.object({
  fecha:          textoRequerido("La fecha", true),
  monto:          numeroPositivo("El monto"),
  observacion:    z.string().optional(),
  id_venta:       idPositivo("La venta", true),
  id_metodo_pago: idPositivo("El método de pago").optional(),
  id_estado_pago: idPositivo("El estado del pago").optional(),
});
export const updatePaymentSchema = createPaymentSchema.partial();

// ── Sale ──────────────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  fecha:       textoRequerido("La fecha", true),
  total:       numeroPositivo("El total"),
  observacion: z.string().optional(),
  id_cita:     idPositivo("La cita", true).nullable().optional(),
  id_cliente:  idPositivo("El cliente").optional(),
});
export const updateSaleSchema = createSaleSchema.partial();

// ── SaleDetail ────────────────────────────────────────────────────────────
// id_venta e id_servicio son obligatorios: un DetalleVenta sin Venta ni
// Servicio no representa nada facturable, y el frontend (OrdersPage.tsx)
// siempre los exige y los envía — dejarlos opcionales solo permitía crear
// registros huérfanos que además se saltan sumaServiciosVenta (el guard de
// total vs. suma de servicios asume que todo detalle pertenece a una Venta).
export const createSaleDetailSchema = z.object({
  fecha:       textoRequerido("La fecha", true),
  precio:      numeroPositivo("El precio"),
  observacion: z.string().optional(),
  id_venta:    idPositivo("La venta", true),
  id_servicio: idPositivo("El servicio"),
  id_estado:   idPositivo("El estado del servicio").optional(),
  id_marco:    idPositivo("El marco").nullable().optional(),
});
export const updateSaleDetailSchema = createSaleDetailSchema.partial();

// ── Service ───────────────────────────────────────────────────────────────
export const createServiceSchema = z.object({
  nombre:      textoRequerido("El nombre del servicio"),
  duracion:    idPositivo("La duración", true),
  descripcion: z.string().optional(),
});
export const updateServiceSchema = createServiceSchema.partial();

// ── User ──────────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  correo: z.string({ error: "El correo es requerido" }).email("Correo inválido"),
  clave:  claveSchema,
  id_rol: idPositivo("El rol").optional(),
});
export const updateUserSchema = z.object({
  correo: z.string({ error: "El correo es requerido" }).email("Correo inválido").optional(),
  clave:  claveSchema.optional(),
  id_rol: idPositivo("El rol").optional(),
});
