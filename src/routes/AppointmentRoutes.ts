import { Router } from "express";
import { getAllAppointment, getAppointmentById, createAppointment,
         updateAppointment, deleteAppointment, createSaleFromAppointment } from "../controllers/AppointmentController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createAppointmentSchema, updateAppointmentSchema, createSaleFromAppointmentSchema } from "../schemas/appointment.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",       requirePermission("CITAS.VER"),      getAllAppointment);
router.get("/:id",    requirePermission("CITAS.VER"),      getAppointmentById);
router.post("/",      requirePermission("CITAS.CREAR"),  validate(createAppointmentSchema),            createAppointment);
router.put("/:id",    requirePermission("CITAS.EDITAR"), validate(updateAppointmentSchema),            updateAppointment);
router.delete("/:id", requirePermission("CITAS.ELIMINAR"), deleteAppointment);
router.post("/:id/create-sale", requirePermission("VENTAS.CREAR"), validate(createSaleFromAppointmentSchema), createSaleFromAppointment);

export { router as appointmentRouter };