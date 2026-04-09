import { Router } from "express";
import { getAllPayment, getPaymentById, createPayment,
         updatePayment, deletePayment } from "../controllers/PaymentController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllPayment);
router.get("/:id",    getPaymentById);
router.post("/",      createPayment);
router.put("/:id",    updatePayment);
router.delete("/:id", deletePayment);

export { router as pagoRouter };
