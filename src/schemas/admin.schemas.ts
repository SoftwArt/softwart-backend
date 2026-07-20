import { z } from "zod";
import { claveSchema, telefonoSchema, nombreSchema, validarDocumentoPorTipo } from "./auth.schemas";

// ── Catálogos de nombre único ──────────────────────────────────────────────
const nombre    = z.object({ nombre: z.string().min(1, "nombre es requerido") });
const nombreOpt = z.object({ nombre: z.string().min(1).optional() });

export const createPaymentMethodSchema    = nombre;
export const updatePaymentMethodSchema    = nombreOpt;
export const createPaymentStatusSchema    = nombre;
export const updatePaymentStatusSchema    = nombreOpt;
export const createServiceStatusSchema    = nombre;
export const updateServiceStatusSchema    = nombreOpt;
export const createAppointmentStatusSchema = nombre;
export const updateAppointmentStatusSchema = nombreOpt;
export const createRoleSchema             = nombre;
export const updateRoleSchema             = nombreOpt;

// ── PATCH: asignación de FK a otra entidad ────────────────────────────────
export const assignPaymentMethodSchema    = z.object({ id_metodo_pago:  z.number().int().positive() });
export const changePaymentStatusSchema    = z.object({ id_estado_pago:  z.number().int().positive() });
export const changeSaleDetailStatusSchema = z.object({ id_estado:       z.number().int().positive() });
export const changeAppointmentStatusSchema = z.object({ id_estado_cita: z.number().int().positive() });

// ── Client ────────────────────────────────────────────────────────────────
// La única forma de que un Cliente tenga cuenta de Usuario es el autorregistro
// público (POST /api/auth/register) — ahí sí queda la aceptación digital de
// ToS/PyP del propio titular. El panel admin solo administra la ficha del
// Cliente (sin cuenta), nunca crea acceso al portal en su nombre.
const clientShape = z.object({
  tipoDocumento: z.string().min(1),
  documento:     z.string().min(1),
  nombre:        nombreSchema,
  correo:        z.string().email("Correo inválido"),
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
  codigo:            z.string().min(1),
  colilla:           z.string().min(1),
  precio_ensamblado: z.number().positive(),
});
export const updateFrameSchema = createFrameSchema.partial();

// ── Permission ────────────────────────────────────────────────────────────
export const createPermissionSchema = z.object({
  nombre:      z.string().min(1),
  descripcion: z.string().min(1),
});
export const updatePermissionSchema = createPermissionSchema.partial();

// ── RolePermission ────────────────────────────────────────────────────────
export const rolePermissionSchema = z.object({
  id_permiso: z.number().int().positive(),
  id_rol:     z.number().int().positive(),
});

// ── Payment ───────────────────────────────────────────────────────────────
export const createPaymentSchema = z.object({
  fecha:          z.string().min(1),
  monto:          z.number().positive(),
  observacion:    z.string().optional(),
  id_venta:       z.number().int().positive().optional(),
  id_metodo_pago: z.number().int().positive().optional(),
  id_estado_pago: z.number().int().positive().optional(),
});
export const updatePaymentSchema = createPaymentSchema.partial();

// ── Sale ──────────────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  fecha:       z.string().min(1),
  total:       z.number().positive(),
  observacion: z.string().optional(),
  id_cita:     z.number().int().positive().nullable().optional(),
  id_cliente:  z.number().int().positive().optional(),
});
export const updateSaleSchema = createSaleSchema.partial();

// ── SaleDetail ────────────────────────────────────────────────────────────
export const createSaleDetailSchema = z.object({
  fecha:       z.string().min(1),
  precio:      z.number().positive(),
  observacion: z.string().optional(),
  id_venta:    z.number().int().positive().optional(),
  id_servicio: z.number().int().positive().optional(),
  id_estado:   z.number().int().positive().optional(),
  id_marco:    z.number().int().positive().nullable().optional(),
});
export const updateSaleDetailSchema = createSaleDetailSchema.partial();

// ── Service ───────────────────────────────────────────────────────────────
export const createServiceSchema = z.object({
  nombre:      z.string().min(1),
  duracion:    z.string().min(1),
  descripcion: z.string().optional(),
});
export const updateServiceSchema = createServiceSchema.partial();

// ── User ──────────────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  correo: z.string().email("Correo inválido"),
  clave:  claveSchema,
  id_rol: z.number().int().positive().optional(),
});
export const updateUserSchema = z.object({
  correo: z.string().email("Correo inválido").optional(),
  clave:  claveSchema.optional(),
  id_rol: z.number().int().positive().optional(),
});
