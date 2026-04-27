import { Router } from "express";
import { publicAvailability, guestAppointment, registerGuest, register, login, recover, resetPassword, resendCode, myPermissions } from "../controllers/AuthController";
import { authLimiter, resendLimiter } from "../middlewares/rateLimit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { guestAppointmentSchema, guestClientSchema, registerSchema, loginSchema, recoverSchema, resetPasswordSchema, resendCodeSchema } from "../schemas/auth.schemas";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.get ("/me/permissions",   verifyToken,   myPermissions);

// Todos públicos — rate-limited
router.get ("/availability",     publicAvailability);
router.post("/guest-appointment",authLimiter,   validate(guestAppointmentSchema), guestAppointment);
router.post("/register-guest",   authLimiter,   validate(guestClientSchema),      registerGuest);
router.post("/register",         authLimiter,   validate(registerSchema),         register);
router.post("/login",            authLimiter,   validate(loginSchema),            login);
router.post("/recover",          authLimiter,   validate(recoverSchema),          recover);
router.post("/reset-password",   authLimiter,   validate(resetPasswordSchema),    resetPassword);
router.post("/reenviar-codigo",  resendLimiter, validate(resendCodeSchema),       resendCode);

export { router as authRouter };
