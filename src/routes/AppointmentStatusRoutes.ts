import { Router } from "express";
import { getAllAppointmentStatus, getAppointmentStatusById, createAppointmentStatus,
         updateAppointmentStatus, deleteAppointmentStatus, changeAppointmentStatus } from "../controllers/AppointmentStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createAppointmentStatusSchema, updateAppointmentStatusSchema,
         changeAppointmentStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllAppointmentStatus);
router.get("/:id", getAppointmentStatusById);

router.post("/",   verifyToken, requireRol("Admin"), validate(createAppointmentStatusSchema), createAppointmentStatus);
router.put("/:id", verifyToken, requireRol("Admin"), validate(updateAppointmentStatusSchema), updateAppointmentStatus);
router.delete("/:id", verifyToken, requireRol("Admin"), deleteAppointmentStatus);

router.patch("/cita/:id_cita/estado", verifyToken, requireRol("Admin"), validate(changeAppointmentStatusSchema), changeAppointmentStatus);

export { router as appointmentStatusRouter };
