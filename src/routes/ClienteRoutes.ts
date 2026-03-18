import { Router } from "express";
import { getAllCliente, getClienteById, createCliente,
         updateCliente, deleteCliente, toggleEstadoCliente } from "../controllers/ClienteController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",             getAllCliente);
router.get("/:id",          getClienteById);
router.post("/",            createCliente);
router.put("/:id",          updateCliente);
router.delete("/:id",       deleteCliente);
router.patch("/:id/estado", toggleEstadoCliente);

export { router as clienteRouter };
