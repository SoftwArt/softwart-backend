import { Router } from "express";
import { getAllServicio, getServicioById, createServicio,
         updateServicio, deleteServicio, toggleEstadoServicio } from "../controllers/ServicioController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos (landing muestra los tipos de servicio) ─────────
router.get("/",    getAllServicio);
router.get("/:id", getServicioById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",            verifyToken, requireRol("Admin", "Empleado"), createServicio);
router.put("/:id",          verifyToken, requireRol("Admin", "Empleado"), updateServicio);
router.delete("/:id",       verifyToken, requireRol("Admin", "Empleado"), deleteServicio);
router.patch("/:id/estado", verifyToken, requireRol("Admin", "Empleado"), toggleEstadoServicio);

export { router as servicioRouter };
