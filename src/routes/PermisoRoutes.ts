import { Router } from "express";
import { getAllPermission, getPermissionById, createPermission,
         updatePermission, deletePermission, togglePermissionStatus } from "../controllers/PermissionController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllPermission);
router.get("/:id",          getPermissionById);
router.post("/",            createPermission);
router.put("/:id",          updatePermission);
router.delete("/:id",       deletePermission);
router.patch("/:id/estado", togglePermissionStatus);

export { router as permisoRouter };
