import { Router } from "express";
import { getAllPaymentStatus, getPaymentStatusById, createPaymentStatus,
         updatePaymentStatus, deletePaymentStatus, changePaymentStatus } from "../controllers/PaymentStatusController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentStatusSchema, updatePaymentStatusSchema,
         changePaymentStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllPaymentStatus);
router.get("/:id", getPaymentStatusById);

router.post("/",   verifyToken, requirePermission("PAGOS.EDITAR"), validate(createPaymentStatusSchema), createPaymentStatus);
router.put("/:id", verifyToken, requirePermission("PAGOS.EDITAR"), validate(updatePaymentStatusSchema), updatePaymentStatus);
router.delete("/:id", verifyToken, requirePermission("PAGOS.EDITAR"), deletePaymentStatus);

router.patch("/pago/:id_pago/estado", verifyToken, requirePermission("PAGOS.CAMBIAR_ESTADO"), validate(changePaymentStatusSchema), changePaymentStatus);

export { router as paymentStatusRouter };
