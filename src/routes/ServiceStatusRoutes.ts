import { Router } from "express";
import { getAllServiceStatus, getServiceStatusById, createServiceStatus,
         updateServiceStatus, deleteServiceStatus, changeSaleDetailStatus } from "../controllers/ServiceStatusController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createServiceStatusSchema, updateServiceStatusSchema,
         changeSaleDetailStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllServiceStatus);
router.get("/:id", getServiceStatusById);

router.post("/",   verifyToken, requireRol("Admin", "Empleado"), validate(createServiceStatusSchema), createServiceStatus);
router.put("/:id", verifyToken, requireRol("Admin", "Empleado"), validate(updateServiceStatusSchema), updateServiceStatus);
router.delete("/:id", verifyToken, requireRol("Admin", "Empleado"), deleteServiceStatus);

router.patch("/detalle/:id_detalle/estado", verifyToken, requireRol("Admin", "Empleado"), validate(changeSaleDetailStatusSchema), changeSaleDetailStatus);

export { router as serviceStatusRouter };
