// src/routes/CuentaClienteRoutes.ts
import { Router }                                                          from "express";
import { verPerfil, editarPerfil, misCitas, crearMiCita, cancelarMiCita, eliminarCuenta, disponibilidadCitas } from "../controllers/CuentaClienteController";
import { verifyToken, requireCliente }                                     from "../middlewares/auth.middleware";

const router = Router();
router.use(verifyToken, requireCliente);

router.get("/perfil",  verPerfil);       // GET    /api/cuenta/perfil
router.put("/perfil",  editarPerfil);    // PUT    /api/cuenta/perfil
router.get("/citas",   misCitas);        // GET    /api/cuenta/citas
router.post("/citas",  crearMiCita);     // POST   /api/cuenta/citas
router.patch("/citas/:id/cancelar", cancelarMiCita); // PATCH /api/cuenta/citas/:id/cancelar
router.get("/disponibilidad", disponibilidadCitas); // GET /api/cuenta/disponibilidad?fecha=
router.delete("/",     eliminarCuenta);  // DELETE /api/cuenta

export { router as cuentaClienteRouter };