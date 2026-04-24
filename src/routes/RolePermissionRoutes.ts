import { Router } from "express";
import { getAllRolePermission, createRolePermission,
         deleteRolePermission } from "../controllers/RolePermissionController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { rolePermissionSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",    getAllRolePermission);
router.post("/",   validate(rolePermissionSchema), createRolePermission);
router.delete("/", validate(rolePermissionSchema), deleteRolePermission);

export { router as rolePermissionRouter };
