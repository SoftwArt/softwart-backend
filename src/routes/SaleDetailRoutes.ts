import { Router } from "express";
import { getAllSaleDetail, getSaleDetailById, createSaleDetail,
         updateSaleDetail, toggleSaleDetailStatus, getSaleDetailHistorial } from "../controllers/SaleDetailController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSaleDetailSchema, updateSaleDetailSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllSaleDetail);
router.get("/:id",          getSaleDetailById);
router.post("/",            validate(createSaleDetailSchema), createSaleDetail);
router.put("/:id",          validate(updateSaleDetailSchema), updateSaleDetail);
router.patch("/:id/estado", toggleSaleDetailStatus);
router.get("/:id/historial", getSaleDetailHistorial);

export { router as saleDetailRouter };
