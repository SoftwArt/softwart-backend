import { Router } from "express";
import { getAllUser, getUserById, createUser,
         updateUser, deleteUser, toggleUserStatus } from "../controllers/UserController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema } from "../schemas/admin.schemas";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllUser);
router.get("/:id",          getUserById);
router.post("/",            validate(createUserSchema), createUser);
router.put("/:id",          validate(updateUserSchema), updateUser);
router.delete("/:id",       deleteUser);
router.patch("/:id/estado", toggleUserStatus);

export { router as userRouter };
