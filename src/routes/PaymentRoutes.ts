import { Router } from "express";
import { getAllPayment, getPaymentById, createPayment,
         updatePayment } from "../controllers/PaymentController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentSchema, updatePaymentSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllPayment);
router.get("/:id",    getPaymentById);
router.post("/",      validate(createPaymentSchema), createPayment);
router.put("/:id",    validate(updatePaymentSchema), updatePayment);

export { router as paymentRouter };
