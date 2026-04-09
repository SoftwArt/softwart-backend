import { Router } from "express";
import { getAllClient, getClientById, createClient,
         updateClient, deleteClient, toggleClientStatus } from "../controllers/ClientController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllClient);
router.get("/:id",          getClientById);
router.post("/",            createClient);
router.put("/:id",          updateClient);
router.delete("/:id",       deleteClient);
router.patch("/:id/estado", toggleClientStatus);

export { router as clienteRouter };
