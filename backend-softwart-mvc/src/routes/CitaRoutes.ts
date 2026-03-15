import { Router } from "express";
import { getAllCita, getCitaById, createCita,
         updateCita, deleteCita, crearVentaDesdeCita } from "../controllers/CitaController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin", "Empleado"));

router.get("/",       getAllCita);
router.get("/:id",    getCitaById);
router.post("/",      createCita);
router.put("/:id",    updateCita);
router.delete("/:id", deleteCita);
router.post("/:id/crear-venta", crearVentaDesdeCita); // POST /api/citas/:id/crear-venta

export { router as citaRouter };