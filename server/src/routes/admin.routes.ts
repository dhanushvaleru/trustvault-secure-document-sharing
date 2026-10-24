import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";
import { updateUserStatusSchema, auditQuerySchema } from "../validation/index.js";

const router = Router();

// All administrative routes require valid session AND ADMIN role
router.use(authenticate, requireAdmin);

router.get("/dashboard", AdminController.getDashboardMetrics);
router.get("/users", AdminController.listUsers);
router.patch("/users/:id/status", validateBody(updateUserStatusSchema), AdminController.updateUserStatus);
router.get("/audit", validateQuery(auditQuerySchema), AdminController.listAuditLogs);
router.get("/audit/verify", AdminController.verifyAuditChain);
router.post("/audit/checkpoint", AdminController.generateCheckpoint);

export default router;
