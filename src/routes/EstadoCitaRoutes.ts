import { Router } from "express";
import { getAllEstadoCita, getEstadoCitaById, createEstadoCita,
         updateEstadoCita, deleteEstadoCita, cambiarEstadoCita } from "../controllers/EstadoCitaController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos (frontend landing y formularios los consumen) ───
router.get("/",    getAllEstadoCita);
router.get("/:id", getEstadoCitaById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createEstadoCita);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateEstadoCita);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteEstadoCita);

// PATCH /cita/:id_cita/estado → cambiar estado de una Cita
router.patch("/cita/:id_cita/estado", verifyToken, requireRol("Admin", "Empleado"), cambiarEstadoCita);

export { router as estadoCitaRouter };
