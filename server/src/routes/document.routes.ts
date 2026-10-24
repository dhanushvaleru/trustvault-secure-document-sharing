import { Router } from "express";
import multer from "multer";
import { DocumentController } from "../controllers/document.controller.js";
import { PermissionController } from "../controllers/permission.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireDocumentAccess } from "../middleware/document-access.middleware.js";
import { validateBody, validateQuery } from "../middleware/validate.middleware.js";
import {
  updateDocumentMetadataSchema,
  documentQuerySchema,
  grantPermissionSchema,
  updatePermissionSchema,
} from "../validation/index.js";
import { config } from "../config/index.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
  },
});

const router = Router();

// Document Endpoints
router.get("/", authenticate, validateQuery(documentQuerySchema), DocumentController.listDocuments);
router.post("/", authenticate, upload.single("file"), DocumentController.uploadDocument);
router.get("/:id", authenticate, requireDocumentAccess("METADATA_OR_AUDIT"), DocumentController.getDocument);
router.patch("/:id", authenticate, requireDocumentAccess("EDIT"), validateBody(updateDocumentMetadataSchema), DocumentController.updateDocument);
router.delete("/:id", authenticate, requireDocumentAccess("OWNER"), DocumentController.deleteDocument);
router.get("/:id/download", authenticate, requireDocumentAccess("READ"), DocumentController.downloadDocument);

// Document Permission Management (Nested under document ID)
router.get("/:id/permissions", authenticate, requireDocumentAccess("OWNER"), PermissionController.listPermissions);
router.post("/:id/permissions", authenticate, requireDocumentAccess("OWNER"), validateBody(grantPermissionSchema), PermissionController.grantPermission);
router.patch("/:id/permissions/:userId", authenticate, requireDocumentAccess("OWNER"), validateBody(updatePermissionSchema), PermissionController.updatePermission);
router.delete("/:id/permissions/:userId", authenticate, requireDocumentAccess("OWNER"), PermissionController.revokePermission);

export default router;
