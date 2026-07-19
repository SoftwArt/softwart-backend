import { Router } from "express";
import { getPoliticaPrivacidad, getTerminosServicio } from "../controllers/LegalController";

const router = Router();

// Públicas — cualquiera debe poder leer estos documentos, con o sin cuenta.
router.get("/politica-privacidad", getPoliticaPrivacidad);
router.get("/terminos-servicio",   getTerminosServicio);

export { router as legalRouter };
