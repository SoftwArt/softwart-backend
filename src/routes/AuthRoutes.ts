import { Router } from "express";
import { register, login, recover, resetPassword, resendCode } from "../controllers/AuthController";
import { authLimiter, resendLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// Todos públicos — rate-limited
router.post("/register",         authLimiter,   register);
router.post("/login",            authLimiter,   login);
router.post("/recover",        authLimiter,   recover);
router.post("/reset-password",   authLimiter,   resetPassword);
router.post("/reenviar-codigo",  resendLimiter, resendCode);

export { router as authRouter };
