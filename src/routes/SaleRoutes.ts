import { Router } from "express";
import { getAllSale, getSaleById, createSale,
         updateSale, deleteSale, toggleSaleStatus } from "../controllers/SaleController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllSale);
router.get("/:id",          getSaleById);
router.post("/",            createSale);
router.put("/:id",          updateSale);
router.delete("/:id",       deleteSale);
router.patch("/:id/estado", toggleSaleStatus);

export { router as saleRouter };
