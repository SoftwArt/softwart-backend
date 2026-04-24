import { Router } from "express";
import { register, login, recover, resetPassword, resendCode } from "../controllers/AuthController";
import { authLimiter, resendLimiter } from "../middlewares/rateLimit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema, recoverSchema, resetPasswordSchema, resendCodeSchema } from "../schemas/auth.schemas";

const router = Router();

// Todos públicos — rate-limited
router.post("/register",        authLimiter,   validate(registerSchema),       register);
router.post("/login",           authLimiter,   validate(loginSchema),          login);
router.post("/recover",         authLimiter,   validate(recoverSchema),        recover);
router.post("/reset-password",  authLimiter,   validate(resetPasswordSchema),  resetPassword);
router.post("/reenviar-codigo", resendLimiter, validate(resendCodeSchema),     resendCode);

export { router as authRouter };
