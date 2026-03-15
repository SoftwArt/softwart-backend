import { Router } from "express";
import { getAllEstadoPago, getEstadoPagoById, createEstadoPago,
         updateEstadoPago, deleteEstadoPago, cambiarEstadoPago } from "../controllers/EstadoPagoController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllEstadoPago);
router.get("/:id", getEstadoPagoById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createEstadoPago);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateEstadoPago);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteEstadoPago);

// PATCH /pago/:id_pago/estado → cambiar estado de un Pago
router.patch("/pago/:id_pago/estado", verifyToken, requireRol("Admin", "Empleado"), cambiarEstadoPago);

export { router as estadoPagoRouter };
