import { Router } from "express";
import { getAllEstadoServicio, getEstadoServicioById, createEstadoServicio,
         updateEstadoServicio, deleteEstadoServicio, cambiarEstadoDetalle } from "../controllers/EstadoServicioController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllEstadoServicio);
router.get("/:id", getEstadoServicioById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createEstadoServicio);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateEstadoServicio);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteEstadoServicio);

// PATCH /detalle/:id_detalle/estado → cambiar estadoServicio de un DetalleVenta
router.patch("/detalle/:id_detalle/estado", verifyToken, requireRol("Admin", "Empleado"), cambiarEstadoDetalle);

export { router as estadoServicioRouter };
