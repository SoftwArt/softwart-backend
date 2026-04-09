import { Router } from "express";
import { getAllUser, getUserById, createUser,
         updateUser, deleteUser, toggleUserStatus } from "../controllers/UserController";
import { verifyToken, requireRol } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken, requireRol("Admin"));

router.get("/",             getAllUser);
router.get("/:id",          getUserById);
router.post("/",            createUser);
router.put("/:id",          updateUser);
router.delete("/:id",       deleteUser);
router.patch("/:id/estado", toggleUserStatus);

export { router as usuarioRouter };
