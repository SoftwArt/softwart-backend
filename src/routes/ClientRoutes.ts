import { Router } from "express";
import { getAllClient, getClientById, createClient,
         updateClient, deleteClient, toggleClientStatus } from "../controllers/ClientController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createClientSchema, updateClientSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("CLIENTES.VER"),           getAllClient);
router.get("/:id",          requirePermission("CLIENTES.VER"),           getClientById);
router.post("/",            requirePermission("CLIENTES.CREAR"),  validate(createClientSchema), createClient);
router.put("/:id",          requirePermission("CLIENTES.EDITAR"), validate(updateClientSchema), updateClient);
router.delete("/:id",       requirePermission("CLIENTES.ELIMINAR"),      deleteClient);
router.patch("/:id/estado", requirePermission("CLIENTES.TOGGLE_ESTADO"), toggleClientStatus);

export { router as clientRouter };
