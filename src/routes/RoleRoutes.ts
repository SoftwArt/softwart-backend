import { Router } from "express";
import { getAllRole, getRoleById, createRole,
         updateRole, deleteRole, toggleRoleStatus } from "../controllers/RoleController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createRoleSchema, updateRoleSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllRole);
router.get("/:id",          getRoleById);
router.post("/",            validate(createRoleSchema), createRole);
router.put("/:id",          validate(updateRoleSchema), updateRole);
router.delete("/:id",       deleteRole);
router.patch("/:id/estado", toggleRoleStatus);

export { router as roleRouter };
