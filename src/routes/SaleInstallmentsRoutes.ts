// src/routes/VentaAbonosRoutes.ts
// Se monta en app.ts como: app.use("/api/ventas", saleInstallmentsRouter)
// Convive con las rutas existentes de /api/ventas (VentaController)
import { Router }                                                from "express";
import { getPaymentPlan, registerInstallment, configureInstallments }     from "../controllers/SaleInstallmentsController";
import { verifyToken, requireRol }                               from "../middlewares/auth.middleware";

const router = Router();

// Todas requieren estar autenticado como Admin o Empleado
router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get  ("/:id/payment-plan",            getPaymentPlan);
router.post ("/:id/installment",             registerInstallment);
router.patch("/:id/configure-installments",  configureInstallments);

export { router as saleInstallmentsRouter };