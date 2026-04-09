import { Router } from "express";
import { getAllPaymentStatus, getPaymentStatusById, createPaymentStatus,
         updatePaymentStatus, deletePaymentStatus, changePaymentStatus } from "../controllers/PaymentStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

// ── Públicos ─────────────────────────────────────────────────
router.get("/",    getAllPaymentStatus);
router.get("/:id", getPaymentStatusById);

// ── Admin + Empleado ─────────────────────────────────────────
router.post("/",   verifyToken, requireRol("Admin", "Empleado"), createPaymentStatus);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), updatePaymentStatus);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deletePaymentStatus);

// PATCH /pago/:id_pago/estado → cambiar estado de un Pago
router.patch("/pago/:id_pago/estado", verifyToken, requireRol("Admin", "Empleado"), changePaymentStatus);

export { router as estadoPagoRouter };
