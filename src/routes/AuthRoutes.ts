import { Router } from "express";
import { registro, login, recuperar, resetPassword } from "../controllers/AuthController";
import { authLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// Todos públicos — rate-limited
router.post("/registro",       authLimiter, registro);
router.post("/login",          authLimiter, login);
router.post("/recuperar",      authLimiter, recuperar);
router.post("/reset-password", authLimiter, resetPassword);

export { router as authRouter };
