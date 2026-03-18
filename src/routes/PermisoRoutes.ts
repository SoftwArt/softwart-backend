import { Router } from "express";
import { getAllPermiso, getPermisoById, createPermiso,
         updatePermiso, deletePermiso, toggleEstadoPermiso } from "../controllers/PermisoController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllPermiso);
router.get("/:id",          getPermisoById);
router.post("/",            createPermiso);
router.put("/:id",          updatePermiso);
router.delete("/:id",       deletePermiso);
router.patch("/:id/estado", toggleEstadoPermiso);

export { router as permisoRouter };
