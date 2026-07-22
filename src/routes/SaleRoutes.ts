import { Router } from "express";
import { getAllSale, getSaleById, createSale,
         updateSale, toggleSaleStatus, deleteSale } from "../controllers/SaleController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSaleSchema, updateSaleSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("VENTAS.VER"),           getAllSale);
router.get("/:id",          requirePermission("VENTAS.VER"),           getSaleById);
router.post("/",            requirePermission("VENTAS.CREAR"),  validate(createSaleSchema), createSale);
router.put("/:id",          requirePermission("VENTAS.EDITAR"), validate(updateSaleSchema), updateSale);
router.delete("/:id",       requirePermission("VENTAS.ELIMINAR"), deleteSale);
router.patch("/:id/estado", requirePermission("VENTAS.TOGGLE_ESTADO"), toggleSaleStatus);

export { router as saleRouter };
