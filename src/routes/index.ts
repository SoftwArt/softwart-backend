// ─────────────────────────────────────────────────────────────────────────────
//  routes/index.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Application } from "express";
import { permisoRouter }        from "./PermisoRoutes";
import { rolRouter }            from "./RolRoutes";
import { permisoRolRouter }     from "./PermisoRolRoutes";
import { usuarioRouter }        from "./UsuarioRoutes";
import { clienteRouter }        from "./ClienteRoutes";
import { servicioRouter }       from "./ServicioRoutes";
import { estadoCitaRouter }     from "./EstadoCitaRoutes";
import { estadoServicioRouter } from "./EstadoServicioRoutes";
import { metodoPagoRouter }     from "./MetodoPagoRoutes";
import { estadoPagoRouter }     from "./EstadoPagoRoutes";
import { citaRouter }           from "./CitaRoutes";
import { marcoRouter }          from "./MarcoRoutes";
import { ventaAbonosRouter } from "./VentaAbonosRoutes";
import { ventaRouter }          from "./VentaRoutes";
import { detalleVentaRouter }   from "./DetalleVentaRoutes";
import { pagoRouter }           from "./PagoRoutes";
import { authRouter }           from "./AuthRoutes";
import { cuentaClienteRouter }  from "./CuentaClienteRoutes";
import { dashboardRouter } from './dashboard.routes'

export function registerRoutes(app: Application): void {
  // ── Seguridad ─────────────────────────────────────────────
  app.use("/api/permisos",    permisoRouter);
  app.use("/api/roles",       rolRouter);
  app.use("/api/permiso-rol", permisoRolRouter);
  app.use("/api/usuarios",    usuarioRouter);

  // ── Clientes ──────────────────────────────────────────────
  app.use("/api/clientes",    clienteRouter);

  // ── Catálogos (GETs públicos) ─────────────────────────────
  app.use("/api/servicios",        servicioRouter);
  app.use("/api/estado-cita",      estadoCitaRouter);
  app.use("/api/estado-servicio",  estadoServicioRouter);
  app.use("/api/metodo-pago",      metodoPagoRouter);
  app.use("/api/estado-pago",      estadoPagoRouter);

  // ── Operación ─────────────────────────────────────────────
  app.use("/api/citas",         citaRouter);
  app.use("/api/marcos",        marcoRouter);
  app.use("/api/ventas", ventaAbonosRouter);
  app.use("/api/ventas",        ventaRouter);
  app.use("/api/detalle-venta", detalleVentaRouter);
  app.use("/api/pagos",         pagoRouter);

  // ── Auth y cuenta ─────────────────────────────────────────
  app.use("/api/auth",   authRouter);
  app.use("/api/cuenta", cuentaClienteRouter);

  // ── Dashboard ─────────────────────────────────────────────
  app.use('/api/dashboard', dashboardRouter)
}
