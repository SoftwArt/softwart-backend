// src/routes/VentaAbonosRoutes.ts
// Se monta en app.ts como: app.use("/api/ventas", saleInstallmentsRouter)
// Convive con las rutas existentes de /api/ventas (VentaController)
import { Router }                                                from "express";
import { getPaymentPlan, registerInstallment, configureInstallments }     from "../controllers/SaleInstallmentsController";
import { verifyToken }                                           from "../middlewares/auth.middleware";
import { requirePermission }                                     from "../middlewares/requirePermission.middleware";
import { validate }                                              from "../middlewares/validate.middleware";
import { registerInstallmentSchema, configureInstallmentsSchema } from "../schemas/sale.schemas";

const router = Router();

router.use(verifyToken);

router.get  ("/:id/payment-plan",           requirePermission("VENTAS.VER"),    getPaymentPlan);
router.post ("/:id/installment",            requirePermission("PAGOS.CREAR"),   validate(registerInstallmentSchema),    registerInstallment);
router.patch("/:id/configure-installments", requirePermission("VENTAS.EDITAR"), validate(configureInstallmentsSchema),  configureInstallments);

export { router as saleInstallmentsRouter };