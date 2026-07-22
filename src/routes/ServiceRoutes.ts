import { Router } from "express";
import { getAllService, getServiceById, createService,
         updateService, deleteService, toggleServiceStatus } from "../controllers/ServiceController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createServiceSchema, updateServiceSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllService);
router.get("/:id", getServiceById);

router.post("/",            verifyToken, requirePermission("SERVICIOS.CREAR"),  validate(createServiceSchema), createService);
router.put("/:id",          verifyToken, requirePermission("SERVICIOS.EDITAR"), validate(updateServiceSchema), updateService);
router.delete("/:id",       verifyToken, requirePermission("SERVICIOS.ELIMINAR"),      deleteService);
router.patch("/:id/estado", verifyToken, requirePermission("SERVICIOS.TOGGLE_ESTADO"), toggleServiceStatus);

export { router as serviceRouter };
