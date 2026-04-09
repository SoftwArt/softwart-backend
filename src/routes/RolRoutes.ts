import { Router } from "express";
import { getAllRole, getRoleById, createRole,
         updateRole, deleteRole, toggleRoleStatus } from "../controllers/RoleController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllRole);
router.get("/:id",          getRoleById);
router.post("/",            createRole);
router.put("/:id",          updateRole);
router.delete("/:id",       deleteRole);
router.patch("/:id/estado", toggleRoleStatus);

export { router as rolRouter };
