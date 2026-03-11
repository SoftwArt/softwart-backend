// src/routes/AuthRoutes.ts
import { Router }          from "express";
import { login, registro } from "../controllers/AuthController";
import { authLimiter }     from "../middlewares/rateLimit.middleware";
import * as AuthController from "../controllers/AuthController";

const router = Router();
router.post("/recuperar", authLimiter, AuthController.recuperar);
router.post("/reset-password", authLimiter, AuthController.resetPassword);
router.post("/login",    authLimiter, login);
router.post("/registro", authLimiter, registro);

export { router as authRouter };