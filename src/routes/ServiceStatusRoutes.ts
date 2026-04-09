import { Router } from "express";
import { getAllServiceStatus, getServiceStatusById, createServiceStatus,
         updateServiceStatus, deleteServiceStatus, changeSaleDetailStatus } from "../controllers/ServiceStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllServiceStatus);
router.get("/:id", getServiceStatusById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createServiceStatus);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateServiceStatus);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteServiceStatus);

// PATCH /detalle/:id_detalle/estado → cambiar estadoServicio de un DetalleVenta
router.patch("/detalle/:id_detalle/estado", verifyToken, requireRol("Admin", "Empleado"), changeSaleDetailStatus);

export { router as serviceStatusRouter };
