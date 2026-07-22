import { Router } from "express";
import { getAllPaymentMethod, getPaymentMethodById, createPaymentMethod,
         updatePaymentMethod, deletePaymentMethod, assignPaymentMethod } from "../controllers/PaymentMethodController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentMethodSchema, updatePaymentMethodSchema,
         assignPaymentMethodSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllPaymentMethod);
router.get("/:id", getPaymentMethodById);

router.post("/",   verifyToken, requirePermission("PAGOS.EDITAR"), validate(createPaymentMethodSchema), createPaymentMethod);
router.put("/:id", verifyToken, requirePermission("PAGOS.EDITAR"), validate(updatePaymentMethodSchema), updatePaymentMethod);
router.delete("/:id", verifyToken, requirePermission("PAGOS.EDITAR"), deletePaymentMethod);

router.patch("/pago/:id_pago/metodo", verifyToken, requirePermission("PAGOS.CAMBIAR_METODO"), validate(assignPaymentMethodSchema), assignPaymentMethod);

export { router as paymentMethodRouter };
