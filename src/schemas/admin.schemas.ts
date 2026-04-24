import { z } from "zod";

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
export const createClientSchema = z.object({
  tipoDocumento: z.string().min(1),
  documento:     z.string().min(1),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
});
export const updateClientSchema = createClientSchema.partial();

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
  id_marco:    z.number().int().positive().optional(),
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
  clave:  z.string().min(6, "La clave debe tener al menos 6 caracteres"),
  id_rol: z.number().int().positive().optional(),
});
export const updateUserSchema = z.object({
  correo: z.string().email("Correo inválido").optional(),
  clave:  z.string().min(6, "La clave debe tener al menos 6 caracteres").optional(),
  id_rol: z.number().int().positive().optional(),
});
