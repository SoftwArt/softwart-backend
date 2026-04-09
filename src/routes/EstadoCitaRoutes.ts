import { Router } from "express";
import { getAllAppointmentStatus, getAppointmentStatusById, createAppointmentStatus,
         updateAppointmentStatus, deleteAppointmentStatus, changeAppointmentStatus } from "../controllers/AppointmentStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos (frontend landing y formularios los consumen) ───
router.get("/",    getAllAppointmentStatus);
router.get("/:id", getAppointmentStatusById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createAppointmentStatus);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateAppointmentStatus);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteAppointmentStatus);

// PATCH /cita/:id_cita/estado → cambiar estado de una Cita
router.patch("/cita/:id_cita/estado", verifyToken, requireRol("Admin", "Empleado"), changeAppointmentStatus);

export { router as estadoCitaRouter };
