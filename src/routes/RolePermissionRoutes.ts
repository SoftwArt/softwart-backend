import { Router } from "express";
import { getAllRolePermission, createRolePermission,
         deleteRolePermission } from "../controllers/RolePermissionController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rolePermissionSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",    requirePermission("PERMISOS.VER"),         getAllRolePermission);
router.post("/",   requirePermission("PERMISOS.ASIGNAR_ROL"), validate(rolePermissionSchema), createRolePermission);
router.delete("/", requirePermission("PERMISOS.ASIGNAR_ROL"), validate(rolePermissionSchema), deleteRolePermission);

export { router as rolePermissionRouter };
