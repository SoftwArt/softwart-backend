import { Router } from "express";
import { getAllServiceStatus, getServiceStatusById, createServiceStatus,
         updateServiceStatus, deleteServiceStatus, changeSaleDetailStatus } from "../controllers/ServiceStatusController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createServiceStatusSchema, updateServiceStatusSchema,
         changeSaleDetailStatusSchema } from "../schemas/admin.schemas";

const router = Router();

router.get("/",    getAllServiceStatus);
router.get("/:id", getServiceStatusById);

router.post("/",   verifyToken, requirePermission("PEDIDOS.EDITAR"), validate(createServiceStatusSchema), createServiceStatus);
router.put("/:id", verifyToken, requirePermission("PEDIDOS.EDITAR"), validate(updateServiceStatusSchema), updateServiceStatus);
router.delete("/:id", verifyToken, requirePermission("PEDIDOS.EDITAR"), deleteServiceStatus);

router.patch("/detalle/:id_detalle/estado", verifyToken, requirePermission("PEDIDOS.CAMBIAR_ESTADO"), validate(changeSaleDetailStatusSchema), changeSaleDetailStatus);

export { router as serviceStatusRouter };
