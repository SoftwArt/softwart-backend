import { Router } from "express";
import { getAllFrame, getFrameById, createFrame,
         updateFrame, deleteFrame, toggleFrameStatus } from "../controllers/FrameController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllFrame);
router.get("/:id",          getFrameById);
router.post("/",            createFrame);
router.put("/:id",          updateFrame);
router.delete("/:id",       deleteFrame);
router.patch("/:id/estado", toggleFrameStatus);

export { router as marcoRouter };
