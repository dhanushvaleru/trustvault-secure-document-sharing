import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validation/index.js";

const router = Router();

router.post("/register", validateBody(registerSchema), AuthController.register);
router.post("/login", validateBody(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", authenticate, AuthController.me);
router.get("/demo-accounts", AuthController.getDemoAccounts);

export default router;
