// src/routes/VentaAbonosRoutes.ts
// Se monta en app.ts como: app.use("/api/ventas", ventaAbonosRouter)
// Convive con las rutas existentes de /api/ventas (VentaController)
import { Router }                                                from "express";
import { getEstadoPagos, registrarAbono, configurarAbonos }     from "../controllers/VentaAbonosController";
import { verifyToken, requireRol }                               from "../middlewares/auth.middleware";

const router = Router();

// Todas requieren estar autenticado como Admin o Empleado
router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get  ("/:id/estado-pagos",      getEstadoPagos);     // GET  /api/ventas/:id/estado-pagos
router.post ("/:id/abono",             registrarAbono);      // POST /api/ventas/:id/abono
router.patch("/:id/configurar-abonos", configurarAbonos);    // PATCH /api/ventas/:id/configurar-abonos

export { router as ventaAbonosRouter };