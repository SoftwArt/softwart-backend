// src/seeds/seedPermissions.ts
import { AppDataSource } from "../data-source";
import { Permission }       from "../models/Permission";
import { Role }           from "../models/Role";
import { RolePermission }    from "../models/RolePermission";

const PERMISOS_BASE = [
  // ── Cliente ──────────────────────────────────────────────────────────────
  { nombre: "CUENTA.VER_PERFIL",        descripcion: "Ver perfil del cliente" },
  { nombre: "CUENTA.EDITAR_PERFIL",     descripcion: "Editar perfil del cliente" },
  { nombre: "CUENTA.VER_CITAS",         descripcion: "Ver citas del cliente" },
  { nombre: "CUENTA.ELIMINAR_CUENTA",   descripcion: "Eliminar cuenta del cliente" },

  // ── Clientes ──────────────────────────────────────────────────────────────
  { nombre: "CLIENTES.VER",             descripcion: "Listar y ver clientes" },
  { nombre: "CLIENTES.CREAR",           descripcion: "Crear clientes" },
  { nombre: "CLIENTES.EDITAR",          descripcion: "Editar clientes" },
  { nombre: "CLIENTES.ELIMINAR",        descripcion: "Eliminar clientes" },
  { nombre: "CLIENTES.TOGGLE_ESTADO",   descripcion: "Activar/inactivar clientes" },

  // ── Citas ─────────────────────────────────────────────────────────────────
  { nombre: "CITAS.VER",                descripcion: "Listar y ver citas" },
  { nombre: "CITAS.CREAR",              descripcion: "Crear citas" },
  { nombre: "CITAS.EDITAR",             descripcion: "Editar citas" },
  { nombre: "CITAS.ELIMINAR",           descripcion: "Eliminar citas" },
  { nombre: "CITAS.CAMBIAR_ESTADO",     descripcion: "Cambiar estado de citas" },

  // ── Ventas ────────────────────────────────────────────────────────────────
  { nombre: "VENTAS.VER",               descripcion: "Listar y ver ventas" },
  { nombre: "VENTAS.CREAR",             descripcion: "Crear ventas" },
  { nombre: "VENTAS.EDITAR",            descripcion: "Editar ventas" },
  { nombre: "VENTAS.ELIMINAR",          descripcion: "Eliminar ventas" },
  { nombre: "VENTAS.TOGGLE_ESTADO",     descripcion: "Activar/inactivar ventas" },

  // ── Pedidos (DetalleVenta) ────────────────────────────────────────────────
  { nombre: "PEDIDOS.VER",              descripcion: "Listar y ver pedidos" },
  { nombre: "PEDIDOS.CREAR",            descripcion: "Crear pedidos" },
  { nombre: "PEDIDOS.EDITAR",           descripcion: "Editar pedidos" },
  { nombre: "PEDIDOS.ELIMINAR",         descripcion: "Eliminar pedidos" },
  { nombre: "PEDIDOS.CAMBIAR_ESTADO",   descripcion: "Cambiar estado de pedidos" },

  // ── Pagos ─────────────────────────────────────────────────────────────────
  { nombre: "PAGOS.VER",                descripcion: "Listar y ver pagos" },
  { nombre: "PAGOS.CREAR",              descripcion: "Crear pagos" },
  { nombre: "PAGOS.EDITAR",             descripcion: "Editar pagos" },
  { nombre: "PAGOS.ELIMINAR",           descripcion: "Eliminar pagos" },
  { nombre: "PAGOS.CAMBIAR_ESTADO",     descripcion: "Cambiar estado de pagos" },
  { nombre: "PAGOS.CAMBIAR_METODO",     descripcion: "Cambiar método de pago" },

  // ── Marcos / Calculadora ──────────────────────────────────────────────────
  { nombre: "MARCOS.VER",               descripcion: "Listar y ver marcos" },
  { nombre: "MARCOS.CREAR",             descripcion: "Crear marcos" },
  { nombre: "MARCOS.EDITAR",            descripcion: "Editar marcos" },
  { nombre: "MARCOS.ELIMINAR",          descripcion: "Eliminar marcos" },
  { nombre: "MARCOS.TOGGLE_ESTADO",     descripcion: "Activar/inactivar marcos" },

  // ── Servicios (TipoServicio) ──────────────────────────────────────────────
  { nombre: "SERVICIOS.VER",            descripcion: "Listar y ver servicios" },
  { nombre: "SERVICIOS.CREAR",          descripcion: "Crear servicios" },
  { nombre: "SERVICIOS.EDITAR",         descripcion: "Editar servicios" },
  { nombre: "SERVICIOS.ELIMINAR",       descripcion: "Eliminar servicios" },
  { nombre: "SERVICIOS.TOGGLE_ESTADO",  descripcion: "Activar/inactivar servicios" },

  // ── Usuarios ──────────────────────────────────────────────────────────────
  { nombre: "USUARIOS.VER",             descripcion: "Listar y ver usuarios" },
  { nombre: "USUARIOS.CREAR",           descripcion: "Crear usuarios" },
  { nombre: "USUARIOS.EDITAR",          descripcion: "Editar usuarios" },
  { nombre: "USUARIOS.ELIMINAR",        descripcion: "Eliminar usuarios" },
  { nombre: "USUARIOS.TOGGLE_ESTADO",   descripcion: "Activar/inactivar usuarios" },

  // ── Roles ─────────────────────────────────────────────────────────────────
  { nombre: "ROLES.VER",                descripcion: "Listar y ver roles" },
  { nombre: "ROLES.CREAR",              descripcion: "Crear roles" },
  { nombre: "ROLES.EDITAR",             descripcion: "Editar roles" },
  { nombre: "ROLES.ELIMINAR",           descripcion: "Eliminar roles" },
  { nombre: "ROLES.TOGGLE_ESTADO",      descripcion: "Activar/inactivar roles" },

  // ── Permisos ──────────────────────────────────────────────────────────────
  { nombre: "PERMISOS.VER",             descripcion: "Listar y ver permisos" },
  { nombre: "PERMISOS.CREAR",           descripcion: "Crear permisos" },
  { nombre: "PERMISOS.EDITAR",          descripcion: "Editar permisos" },
  { nombre: "PERMISOS.ELIMINAR",        descripcion: "Eliminar permisos" },
  { nombre: "PERMISOS.ASIGNAR_ROL",     descripcion: "Asignar permisos a roles" },

  // ── Catálogos ─────────────────────────────────────────────────────────────
  { nombre: "CATALOGOS.VER",            descripcion: "Ver catálogos (estados, métodos)" },
  { nombre: "CATALOGOS.EDITAR",         descripcion: "Editar catálogos" },
];

// Permisos que se asignan al rol Cliente
const PERMISOS_CLIENTE = [
  "CUENTA.VER_PERFIL",
  "CUENTA.EDITAR_PERFIL",
  "CUENTA.VER_CITAS",
  "CUENTA.ELIMINAR_CUENTA",
];

// Permisos que se asignan al rol Empleado
const PERMISOS_EMPLEADO = [
  "CLIENTES.VER",    "CLIENTES.CREAR",   "CLIENTES.EDITAR",   "CLIENTES.TOGGLE_ESTADO",
  "CITAS.VER",       "CITAS.CREAR",      "CITAS.EDITAR",      "CITAS.CAMBIAR_ESTADO",
  "VENTAS.VER",      "VENTAS.CREAR",     "VENTAS.EDITAR",     "VENTAS.TOGGLE_ESTADO",
  "PEDIDOS.VER",     "PEDIDOS.CREAR",    "PEDIDOS.EDITAR",    "PEDIDOS.CAMBIAR_ESTADO",
  "PAGOS.VER",       "PAGOS.CREAR",      "PAGOS.EDITAR",      "PAGOS.CAMBIAR_ESTADO",  "PAGOS.CAMBIAR_METODO",
  "MARCOS.VER",      "MARCOS.CREAR",     "MARCOS.EDITAR",     "MARCOS.TOGGLE_ESTADO",
  "SERVICIOS.VER",
  "CATALOGOS.VER",
];

async function asignarPermisos(
  permisoRolRepo: ReturnType<typeof AppDataSource.getRepository<RolePermission>>,
  rol: Role,
  permisos: Permission[],
): Promise<void> {
  for (const permiso of permisos) {
    const existe = await permisoRolRepo
      .createQueryBuilder("pr")
      .where("pr.id_rol = :idRol",           { idRol: rol.id_rol })
      .andWhere("pr.id_permiso = :idPermiso", { idPermiso: permiso.id_permiso })
      .getOne();

    if (!existe) {
      const pr     = new RolePermission();
      pr.permission = permiso;
      pr.role       = rol;
      await permisoRolRepo.save(pr);
    }
  }
}

export async function seedPermissions(): Promise<void> {
  const permisoRepo    = AppDataSource.getRepository(Permission);
  const rolRepo        = AppDataSource.getRepository(Role);
  const permisoRolRepo = AppDataSource.getRepository(RolePermission);

  // ── 1. Crear permisos que no existan ──────────────────────────────────────
  for (const { nombre, descripcion } of PERMISOS_BASE) {
    const existe = await permisoRepo.findOne({ where: { nombre } });
    if (!existe) {
      await permisoRepo.save(
        permisoRepo.create({ nombre, descripcion, estado: true }),
      );
    }
  }
  console.log("✅  Permisos sembrados");

  // ── 2. Cargar todos los permisos ya guardados ─────────────────────────────
  const todosLosPermisos = await permisoRepo.find();
  const permisosCliente  = todosLosPermisos.filter(p => PERMISOS_CLIENTE.includes(p.nombre));
  const permisosEmpleado = todosLosPermisos.filter(p => PERMISOS_EMPLEADO.includes(p.nombre));

  // ── 3. Asignar a Admin → todos ────────────────────────────────────────────
  const admin = await rolRepo.findOne({ where: { nombre: "Admin" } });
  if (admin) {
    await asignarPermisos(permisoRolRepo, admin, todosLosPermisos);
    console.log("✅  Permisos asignados a Admin");
  }

  // ── 4. Asignar a Empleado → permisos operativos ───────────────────────────
  const empleado = await rolRepo.findOne({ where: { nombre: "Empleado" } });
  if (empleado) {
    await asignarPermisos(permisoRolRepo, empleado, permisosEmpleado);
    console.log("✅  Permisos asignados a Empleado");
  }

  // ── 5. Asignar a Cliente → solo los 4 básicos ─────────────────────────────
  const cliente = await rolRepo.findOne({ where: { nombre: "Cliente" } });
  if (cliente) {
    await asignarPermisos(permisoRolRepo, cliente, permisosCliente);
    console.log("✅  Permisos asignados a Cliente");
  }
}