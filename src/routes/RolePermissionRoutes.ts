import { Router } from "express";
import { getAllRolePermission, createRolePermission,
         deleteRolePermission } from "../controllers/RolePermissionController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",    getAllRolePermission);  // GET    /api/permiso-rol
router.post("/",   createRolePermission); // POST   /api/permiso-rol  { id_permiso, id_rol }
router.delete("/", deleteRolePermission); // DELETE /api/permiso-rol  { id_permiso, id_rol }

export { router as rolePermissionRouter };
