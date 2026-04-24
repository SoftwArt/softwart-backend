import { Router } from "express";
import { getAllPermission, getPermissionById, createPermission,
         updatePermission, deletePermission, togglePermissionStatus } from "../controllers/PermissionController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPermissionSchema, updatePermissionSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllPermission);
router.get("/:id",          getPermissionById);
router.post("/",            validate(createPermissionSchema), createPermission);
router.put("/:id",          validate(updatePermissionSchema), updatePermission);
router.delete("/:id",       deletePermission);
router.patch("/:id/estado", togglePermissionStatus);

export { router as permissionRouter };
