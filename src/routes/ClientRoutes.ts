import { Router } from "express";
import { getAllClient, getClientById, createClient,
         updateClient, deleteClient, toggleClientStatus } from "../controllers/ClientController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createClientSchema, updateClientSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllClient);
router.get("/:id",          getClientById);
router.post("/",            validate(createClientSchema), createClient);
router.put("/:id",          validate(updateClientSchema), updateClient);
router.delete("/:id",       deleteClient);
router.patch("/:id/estado", toggleClientStatus);

export { router as clientRouter };
