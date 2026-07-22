import { Router } from "express";
import { getAllFrame, getFrameById, createFrame,
         updateFrame, deleteFrame, toggleFrameStatus } from "../controllers/FrameController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createFrameSchema, updateFrameSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("MARCOS.VER"),           getAllFrame);
router.get("/:id",          requirePermission("MARCOS.VER"),           getFrameById);
router.post("/",            requirePermission("MARCOS.CREAR"),  validate(createFrameSchema), createFrame);
router.put("/:id",          requirePermission("MARCOS.EDITAR"), validate(updateFrameSchema), updateFrame);
router.delete("/:id",       requirePermission("MARCOS.ELIMINAR"),      deleteFrame);
router.patch("/:id/estado", requirePermission("MARCOS.TOGGLE_ESTADO"), toggleFrameStatus);

export { router as frameRouter };
