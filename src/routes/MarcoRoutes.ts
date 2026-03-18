import { Router } from "express";
import { getAllMarco, getMarcoById, createMarco,
         updateMarco, deleteMarco, toggleEstadoMarco } from "../controllers/MarcoController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllMarco);
router.get("/:id",          getMarcoById);
router.post("/",            createMarco);
router.put("/:id",          updateMarco);
router.delete("/:id",       deleteMarco);
router.patch("/:id/estado", toggleEstadoMarco);

export { router as marcoRouter };
