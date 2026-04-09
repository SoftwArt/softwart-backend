// src/routes/CuentaClienteRoutes.ts
import { Router }                                                          from "express";
import { viewProfile, editProfile, myAppointments, createMyAppointment, cancelMyAppointment, deleteAccount, appointmentAvailability } from "../controllers/ClientAccountController";
import { verifyToken, requireCliente }                                     from "../middlewares/auth.middleware";

const router = Router();
router.use(verifyToken, requireCliente);

router.get("/perfil",  viewProfile);       // GET    /api/cuenta/perfil
router.put("/perfil",  editProfile);    // PUT    /api/cuenta/perfil
router.get("/citas",   myAppointments);        // GET    /api/cuenta/citas
router.post("/citas",  createMyAppointment);     // POST   /api/cuenta/citas
router.patch("/citas/:id/cancelar", cancelMyAppointment); // PATCH /api/cuenta/citas/:id/cancelar
router.get("/disponibilidad", appointmentAvailability); // GET /api/cuenta/disponibilidad?fecha=
router.delete("/",     deleteAccount);  // DELETE /api/cuenta

export { router as clientAccountRouter };