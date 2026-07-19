// ─────────────────────────────────────────────────────────────────────────────
//  routes/index.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Application } from "express";
import { permissionRouter }        from "./PermissionRoutes";
import { roleRouter }              from "./RoleRoutes";
import { rolePermissionRouter }    from "./RolePermissionRoutes";
import { userRouter }              from "./UserRoutes";
import { clientRouter }            from "./ClientRoutes";
import { serviceRouter }           from "./ServiceRoutes";
import { appointmentStatusRouter } from "./AppointmentStatusRoutes";
import { serviceStatusRouter }     from "./ServiceStatusRoutes";
import { paymentMethodRouter }     from "./PaymentMethodRoutes";
import { paymentStatusRouter }     from "./PaymentStatusRoutes";
import { appointmentRouter }       from "./AppointmentRoutes";
import { frameRouter }             from "./FrameRoutes";
import { saleInstallmentsRouter }  from "./SaleInstallmentsRoutes";
import { saleRouter }              from "./SaleRoutes";
import { saleDetailRouter }        from "./SaleDetailRoutes";
import { paymentRouter }           from "./PaymentRoutes";
import { authRouter }              from "./AuthRoutes";
import { clientAccountRouter }     from "./ClientAccountRoutes";
import { dashboardRouter }         from "./dashboard.routes";
import { legalRouter }             from "./LegalRoutes";

export function registerRoutes(app: Application): void {
  // ── Security ──────────────────────────────────────────────
  app.use("/api/permissions",      permissionRouter);
  app.use("/api/roles",            roleRouter);
  app.use("/api/role-permissions", rolePermissionRouter);
  app.use("/api/users",            userRouter);

  // ── Clients ───────────────────────────────────────────────
  app.use("/api/clients",          clientRouter);

  // ── Catalogs ──────────────────────────────────────────────
  app.use("/api/services",           serviceRouter);
  app.use("/api/appointment-status", appointmentStatusRouter);
  app.use("/api/service-status",     serviceStatusRouter);
  app.use("/api/payment-methods",    paymentMethodRouter);
  app.use("/api/payment-status",     paymentStatusRouter);

  // ── Operations ────────────────────────────────────────────
  app.use("/api/appointments",   appointmentRouter);
  app.use("/api/frames",         frameRouter);
  app.use("/api/sales",          saleInstallmentsRouter);
  app.use("/api/sales",          saleRouter);
  app.use("/api/sale-details",   saleDetailRouter);
  app.use("/api/payments",       paymentRouter);

  // ── Auth & Account ────────────────────────────────────────
  app.use("/api/auth",    authRouter);
  app.use("/api/account", clientAccountRouter);

  // ── Dashboard ─────────────────────────────────────────────
  app.use("/api/dashboard", dashboardRouter);

  // ── Legal (público) ───────────────────────────────────────
  app.use("/api/legal", legalRouter);
}
