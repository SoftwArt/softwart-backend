import { Router } from "express";
import { getAllPaymentStatus, getPaymentStatusById, createPaymentStatus,
         updatePaymentStatus, deletePaymentStatus, changePaymentStatus } from "../controllers/PaymentStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPaymentStatusSchema, updatePaymentStatusSchema,
         changePaymentStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllPaymentStatus);
router.get("/:id", getPaymentStatusById);

router.post("/",   verifyToken, requireRol("Admin", "Empleado"), validate(createPaymentStatusSchema), createPaymentStatus);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), validate(updatePaymentStatusSchema), updatePaymentStatus);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deletePaymentStatus);

router.patch("/pago/:id_pago/estado", verifyToken, requireRol("Admin", "Empleado"), validate(changePaymentStatusSchema), changePaymentStatus);

export { router as paymentStatusRouter };
