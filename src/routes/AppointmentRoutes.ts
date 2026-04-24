import { Router } from "express";
import { getAllAppointment, getAppointmentById, createAppointment,
         updateAppointment, deleteAppointment, createSaleFromAppointment } from "../controllers/AppointmentController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createAppointmentSchema, updateAppointmentSchema, createSaleFromAppointmentSchema } from "../schemas/appointment.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllAppointment);
router.get("/:id",    getAppointmentById);
router.post("/",      validate(createAppointmentSchema),            createAppointment);
router.put("/:id",    validate(updateAppointmentSchema),            updateAppointment);
router.delete("/:id", deleteAppointment);
router.post("/:id/create-sale", validate(createSaleFromAppointmentSchema), createSaleFromAppointment);

export { router as appointmentRouter };