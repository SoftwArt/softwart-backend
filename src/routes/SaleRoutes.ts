import { Router } from "express";
import { getAllSale, getSaleById, createSale,
         updateSale, toggleSaleStatus } from "../controllers/SaleController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSaleSchema, updateSaleSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllSale);
router.get("/:id",          getSaleById);
router.post("/",            validate(createSaleSchema), createSale);
router.put("/:id",          validate(updateSaleSchema), updateSale);
router.patch("/:id/estado", toggleSaleStatus);

export { router as saleRouter };
