import { Router } from "express";
import { getAllAppointmentStatus, getAppointmentStatusById, createAppointmentStatus,
         updateAppointmentStatus, deleteAppointmentStatus, changeAppointmentStatus } from "../controllers/AppointmentStatusController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createAppointmentStatusSchema, updateAppointmentStatusSchema,
         changeAppointmentStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllAppointmentStatus);
router.get("/:id", getAppointmentStatusById);

router.post("/",   verifyToken, requirePermission("CITAS.EDITAR"), validate(createAppointmentStatusSchema), createAppointmentStatus);
router.put("/:id", verifyToken, requirePermission("CITAS.EDITAR"), validate(updateAppointmentStatusSchema), updateAppointmentStatus);
router.delete("/:id", verifyToken, requirePermission("CITAS.EDITAR"), deleteAppointmentStatus);

router.patch("/cita/:id_cita/estado", verifyToken, requirePermission("CITAS.CAMBIAR_ESTADO"), validate(changeAppointmentStatusSchema), changeAppointmentStatus);

export { router as appointmentStatusRouter };
