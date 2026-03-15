import { Router } from "express";
import { getAllPermisoRol, createPermisoRol,
         deletePermisoRol } from "../controllers/PermisoRolController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",    getAllPermisoRol);  // GET    /api/permiso-rol
router.post("/",   createPermisoRol); // POST   /api/permiso-rol  { id_permiso, id_rol }
router.delete("/", deletePermisoRol); // DELETE /api/permiso-rol  { id_permiso, id_rol }

export { router as permisoRolRouter };
