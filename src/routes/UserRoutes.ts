import { Router } from "express";
import { getAllUser, getUserById, createUser,
         updateUser, deleteUser, toggleUserStatus } from "../controllers/UserController";
import { verifyToken } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/requirePermission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken);

router.get("/",             requirePermission("USUARIOS.VER"),           getAllUser);
router.get("/:id",          requirePermission("USUARIOS.VER"),           getUserById);
router.post("/",            requirePermission("USUARIOS.CREAR"),  validate(createUserSchema), createUser);
router.put("/:id",          requirePermission("USUARIOS.EDITAR"), validate(updateUserSchema), updateUser);
router.delete("/:id",       requirePermission("USUARIOS.ELIMINAR"),      deleteUser);
router.patch("/:id/estado", requirePermission("USUARIOS.TOGGLE_ESTADO"), toggleUserStatus);

export { router as userRouter };
