import { Router } from "express";
import { publicAvailability, register, login, recover, resetPassword, resendCode, myPermissions, validateResetToken, refreshToken, logout } from "../controllers/AuthController";
import { authLimiter, resendLimiter, refreshLimiter } from "../middlewares/rateLimit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema, recoverSchema, resetPasswordSchema, resendCodeSchema, refreshTokenSchema } from "../schemas/auth.schemas";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.get ("/me/permissions",   verifyToken,   myPermissions);
router.post("/refresh",          refreshLimiter, validate(refreshTokenSchema), refreshToken);
router.post("/logout",           verifyToken,    logout);

// Todos públicos — rate-limited
router.get ("/availability",     publicAvailability);
router.post("/register",         authLimiter,   validate(registerSchema),         register);
router.post("/login",            authLimiter,   validate(loginSchema),            login);
router.post("/recover",          authLimiter,   validate(recoverSchema),          recover);
router.get ("/validate-reset-token", authLimiter, validateResetToken);
router.post("/reset-password",   authLimiter,   validate(resetPasswordSchema),    resetPassword);
router.post("/reenviar-codigo",  resendLimiter, validate(resendCodeSchema),       resendCode);

export { router as authRouter };
