import { Router } from "express";
import { getAllService, getServiceById, createService,
         updateService, deleteService, toggleServiceStatus } from "../controllers/ServiceController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos (landing muestra los tipos de servicio) ─────────
router.get("/",    getAllService);
router.get("/:id", getServiceById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",            verifyToken, requireRol("Admin", "Empleado"), createService);
router.put("/:id",          verifyToken, requireRol("Admin", "Empleado"), updateService);
router.delete("/:id",       verifyToken, requireRol("Admin", "Empleado"), deleteService);
router.patch("/:id/estado", verifyToken, requireRol("Admin", "Empleado"), toggleServiceStatus);

export { router as servicioRouter };
