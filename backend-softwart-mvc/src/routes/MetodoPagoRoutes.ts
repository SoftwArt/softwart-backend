import { Router } from "express";
import { getAllMetodoPago, getMetodoPagoById, createMetodoPago,
         updateMetodoPago, deleteMetodoPago, asignarMetodoPago } from "../controllers/MetodoPagoController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllMetodoPago);
router.get("/:id", getMetodoPagoById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createMetodoPago);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updateMetodoPago);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteMetodoPago);

// PATCH /pago/:id_pago/metodo → asignar método de pago a un Pago
router.patch("/pago/:id_pago/metodo", verifyToken, requireRol("Admin", "Empleado"), asignarMetodoPago);

export { router as metodoPagoRouter };
