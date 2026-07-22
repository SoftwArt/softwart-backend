import { Router } from "express";
import { getAllSaleDetail, getSaleDetailById, createSaleDetail,
         updateSaleDetail, toggleSaleDetailStatus, getSaleDetailHistorial } from "../controllers/SaleDetailController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSaleDetailSchema, updateSaleDetailSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("PEDIDOS.VER"),           getAllSaleDetail);
router.get("/:id",          requirePermission("PEDIDOS.VER"),           getSaleDetailById);
router.post("/",            requirePermission("PEDIDOS.CREAR"),  validate(createSaleDetailSchema), createSaleDetail);
router.put("/:id",          requirePermission("PEDIDOS.EDITAR"), validate(updateSaleDetailSchema), updateSaleDetail);
router.patch("/:id/estado", requirePermission("PEDIDOS.CAMBIAR_ESTADO"), toggleSaleDetailStatus);
router.get("/:id/historial", requirePermission("PEDIDOS.VER"), getSaleDetailHistorial);

export { router as saleDetailRouter };
