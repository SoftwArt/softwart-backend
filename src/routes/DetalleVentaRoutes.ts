import { Router } from "express";
import { getAllSaleDetail, getSaleDetailById, createSaleDetail,
         updateSaleDetail, deleteSaleDetail, toggleSaleDetailStatus } from "../controllers/SaleDetailController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllSaleDetail);
router.get("/:id",          getSaleDetailById);
router.post("/",            createSaleDetail);
router.put("/:id",          updateSaleDetail);
router.delete("/:id",       deleteSaleDetail);
router.patch("/:id/estado", toggleSaleDetailStatus);

export { router as detalleVentaRouter };
