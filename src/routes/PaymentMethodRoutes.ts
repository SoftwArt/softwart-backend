import { Router } from "express";
import { getAllPaymentMethod, getPaymentMethodById, createPaymentMethod,
         updatePaymentMethod, deletePaymentMethod, assignPaymentMethod } from "../controllers/PaymentMethodController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllPaymentMethod);
router.get("/:id", getPaymentMethodById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createPaymentMethod);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updatePaymentMethod);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deletePaymentMethod);

// PATCH /pago/:id_pago/metodo → asignar método de pago a un Pago
router.patch("/pago/:id_pago/metodo", verifyToken, requireRol("Admin", "Empleado"), assignPaymentMethod);

export { router as paymentMethodRouter };
