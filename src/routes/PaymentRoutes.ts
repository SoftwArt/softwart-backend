import { Router } from "express";
import { getAllPayment, getPaymentById, createPayment,
         updatePayment } from "../controllers/PaymentController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentSchema, updatePaymentSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",       requirePermission("PAGOS.VER"),    getAllPayment);
router.get("/:id",    requirePermission("PAGOS.VER"),    getPaymentById);
router.post("/",      requirePermission("PAGOS.CREAR"),  validate(createPaymentSchema), createPayment);
router.put("/:id",    requirePermission("PAGOS.EDITAR"), validate(updatePaymentSchema), updatePayment);

export { router as paymentRouter };
