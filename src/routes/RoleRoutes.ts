import { Router } from "express";
import { getAllRole, getRoleById, createRole,
         updateRole, deleteRole, toggleRoleStatus } from "../controllers/RoleController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createRoleSchema, updateRoleSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("ROLES.VER"),           getAllRole);
router.get("/:id",          requirePermission("ROLES.VER"),           getRoleById);
router.post("/",            requirePermission("ROLES.CREAR"),  validate(createRoleSchema), createRole);
router.put("/:id",          requirePermission("ROLES.EDITAR"), validate(updateRoleSchema), updateRole);
router.delete("/:id",       requirePermission("ROLES.ELIMINAR"),      deleteRole);
router.patch("/:id/estado", requirePermission("ROLES.TOGGLE_ESTADO"), toggleRoleStatus);

export { router as roleRouter };
