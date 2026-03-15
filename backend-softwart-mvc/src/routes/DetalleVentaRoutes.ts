import { Router } from "express";
import { getAllDetalleVenta, getDetalleVentaById, createDetalleVenta,
         updateDetalleVenta, deleteDetalleVenta, toggleEstadoDetalleVenta } from "../controllers/DetalleVentaController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllDetalleVenta);
router.get("/:id",          getDetalleVentaById);
router.post("/",            createDetalleVenta);
router.put("/:id",          updateDetalleVenta);
router.delete("/:id",       deleteDetalleVenta);
router.patch("/:id/estado", toggleEstadoDetalleVenta);

export { router as detalleVentaRouter };
