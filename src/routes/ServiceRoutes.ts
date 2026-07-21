import { Router } from "express";
import { getAllService, getServiceById, createService,
         updateService, deleteService, toggleServiceStatus } from "../controllers/ServiceController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createServiceSchema, updateServiceSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllService);
router.get("/:id", getServiceById);

router.post("/",            verifyToken, requireRol("Admin"), validate(createServiceSchema), createService);
router.put("/:id",          verifyToken, requireRol("Admin"), validate(updateServiceSchema), updateService);
router.delete("/:id",       verifyToken, requireRol("Admin"), deleteService);
router.patch("/:id/estado", verifyToken, requireRol("Admin"), toggleServiceStatus);

export { router as serviceRouter };
