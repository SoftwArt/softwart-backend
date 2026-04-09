import { Router } from "express";
import { getAllAppointment, getAppointmentById, createAppointment,
         updateAppointment, deleteAppointment, createSaleFromAppointment } from "../controllers/AppointmentController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllAppointment);
router.get("/:id",    getAppointmentById);
router.post("/",      createAppointment);
router.put("/:id",    updateAppointment);
router.delete("/:id", deleteAppointment);
router.post("/:id/crear-venta", createSaleFromAppointment); // POST /api/citas/:id/crear-venta

export { router as appointmentRouter };