import { Router } from "express";
import { getAllPago, getPagoById, createPago,
         updatePago, deletePago } from "../controllers/PagoController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllPago);
router.get("/:id",    getPagoById);
router.post("/",      createPago);
router.put("/:id",    updatePago);
router.delete("/:id", deletePago);

export { router as pagoRouter };
