import { Router } from "express";
import { getAllRol, getRolById, createRol,
         updateRol, deleteRol, toggleEstadoRol } from "../controllers/RolController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllRol);
router.get("/:id",          getRolById);
router.post("/",            createRol);
router.put("/:id",          updateRol);
router.delete("/:id",       deleteRol);
router.patch("/:id/estado", toggleEstadoRol);

export { router as rolRouter };
