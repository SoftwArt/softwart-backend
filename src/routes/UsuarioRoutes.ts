import { Router } from "express";
import { getAllUsuario, getUsuarioById, createUsuario,
         updateUsuario, deleteUsuario, toggleEstadoUsuario } from "../controllers/UsuarioController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllUsuario);
router.get("/:id",          getUsuarioById);
router.post("/",            createUsuario);
router.put("/:id",          updateUsuario);
router.delete("/:id",       deleteUsuario);
router.patch("/:id/estado", toggleEstadoUsuario);

export { router as usuarioRouter };
