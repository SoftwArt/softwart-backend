// src/routes/CuentaClienteRoutes.ts
import { Router }                                                          from "express";
import { viewProfile, editProfile, myAppointments, createMyAppointment, cancelMyAppointment, deleteAccount, appointmentAvailability, myServices, myServiceHistorial } from "../controllers/ClientAccountController";
import { verifyToken, requireCliente }                                     from "../middlewares/auth.middleware";
import { validate }                                                        from "../middlewares/validate.middleware";
import { editProfileSchema, createMyAppointmentSchema, cancelMyAppointmentSchema } from "../schemas/account.schemas";

const router = Router();
router.use(verifyToken, requireCliente);

router.get("/perfil",              viewProfile);
router.put("/perfil",              validate(editProfileSchema),            editProfile);
router.get("/citas",               myAppointments);
router.post("/citas",              validate(createMyAppointmentSchema),    createMyAppointment);
router.patch("/citas/:id/cancelar", validate(cancelMyAppointmentSchema), cancelMyAppointment);
router.get("/servicios",           myServices);
router.get("/servicios/:id/historial", myServiceHistorial);
router.get("/availability",        appointmentAvailability);
router.delete("/",                 deleteAccount);

export { router as clientAccountRouter };