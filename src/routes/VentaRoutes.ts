import { Router } from "express";
import { getAllVenta, getVentaById, createVenta,
         updateVenta, deleteVenta, toggleEstadoVenta } from "../controllers/VentaController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllVenta);
router.get("/:id",          getVentaById);
router.post("/",            createVenta);
router.put("/:id",          updateVenta);
router.delete("/:id",       deleteVenta);
router.patch("/:id/estado", toggleEstadoVenta);

export { router as ventaRouter };
