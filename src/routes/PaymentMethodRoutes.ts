import { Router } from "express";
import { getAllPaymentMethod, getPaymentMethodById, createPaymentMethod,
         updatePaymentMethod, deletePaymentMethod, assignPaymentMethod } from "../controllers/PaymentMethodController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentMethodSchema, updatePaymentMethodSchema,
         assignPaymentMethodSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllPaymentMethod);
router.get("/:id", getPaymentMethodById);

router.post("/",   verifyToken, requireRol("Admin"), validate(createPaymentMethodSchema), createPaymentMethod);
router.put("/:id", verifyToken, requireRol("Admin"), validate(updatePaymentMethodSchema), updatePaymentMethod);
router.delete("/:id", verifyToken, requireRol("Admin"), deletePaymentMethod);

router.patch("/pago/:id_pago/metodo", verifyToken, requireRol("Admin"), validate(assignPaymentMethodSchema), assignPaymentMethod);

export { router as paymentMethodRouter };
