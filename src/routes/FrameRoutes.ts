import { Router } from "express";
import { getAllFrame, getFrameById, createFrame,
         updateFrame, deleteFrame, toggleFrameStatus } from "../controllers/FrameController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createFrameSchema, updateFrameSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllFrame);
router.get("/:id",          getFrameById);
router.post("/",            validate(createFrameSchema), createFrame);
router.put("/:id",          validate(updateFrameSchema), updateFrame);
router.delete("/:id",       deleteFrame);
router.patch("/:id/estado", toggleFrameStatus);

export { router as frameRouter };
