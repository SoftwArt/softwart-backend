import { Router } from "express";
import { getAllPermission, getPermissionById, createPermission,
         updatePermission, deletePermission, togglePermissionStatus } from "../controllers/PermissionController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createPermissionSchema, updatePermissionSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("PERMISOS.VER"),      getAllPermission);
router.get("/:id",          requirePermission("PERMISOS.VER"),      getPermissionById);
router.post("/",            requirePermission("PERMISOS.CREAR"),  validate(createPermissionSchema), createPermission);
router.put("/:id",          requirePermission("PERMISOS.EDITAR"), validate(updatePermissionSchema), updatePermission);
router.delete("/:id",       requirePermission("PERMISOS.ELIMINAR"), deletePermission);
router.patch("/:id/estado", requirePermission("PERMISOS.EDITAR"),   togglePermissionStatus);

export { router as permissionRouter };
