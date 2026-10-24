import { Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { AuthenticatedRequest, Role, PermissionLevel, AuditAction, AuditOutcome } from "../types/index.js";
import { AuditService } from "../services/audit.service.js";

export type AccessRequirement = "READ" | "EDIT" | "OWNER" | "METADATA_OR_AUDIT";

export interface DocumentAuthorizedRequest extends AuthenticatedRequest {
  document?: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    originalFilename: string;
    storageKey: string;
    fileSize: number;
    mimeType: string;
    checksumSha256: string;
    ownerId: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  effectivePermission?: "OWNER" | "EDIT" | "READ" | "ADMIN_METADATA";
}

/**
 * Evaluates document-level authorization on every protected document request.
 * Directly queries current database state to guarantee IMMEDIATE REVOCATION.
 */
export function requireDocumentAccess(required: AccessRequirement) {
  return async (req: DocumentAuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const documentId = String(req.params.id || "");
    if (!documentId) {
      res.status(400).json({ error: "Document ID is required" });
      return;
    }

    // Load document from DB
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    // If document doesn't exist or is soft-deleted, return 404
    if (!doc || doc.isDeleted) {
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.ACCESS_DENIED,
        documentId: documentId,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: {
          reason: "Document not found or deleted",
          requestedAccess: required,
          path: req.originalUrl,
        },
      }).catch(() => {});

      res.status(404).json({ error: "Document not found" });
      return;
    }

    // 1. Check Ownership: Document owner has full access
    if (doc.ownerId === user.id) {
      req.document = doc;
      req.effectivePermission = "OWNER";
      return next();
    }

    // 2. Check ADMIN role:
    // Administrators can inspect metadata/audit logs system-wide, but
    // MUST NOT access document contents without explicit grant!
    if (user.role === Role.ADMIN) {
      if (required === "METADATA_OR_AUDIT") {
        req.document = doc;
        req.effectivePermission = "ADMIN_METADATA";
        return next();
      }

      // Admin requesting content access (READ or EDIT):
      const explicitGrant = await prisma.documentPermission.findFirst({
        where: {
          documentId: doc.id,
          userId: user.id,
          revokedAt: null,
        },
      });

      if (!explicitGrant) {
        await AuditService.recordEvent({
          actorUserId: user.id,
          actionType: AuditAction.ACCESS_DENIED,
          documentId: doc.id,
          outcome: AuditOutcome.DENIED,
          correlationId: req.correlationId || "unknown",
          metadata: {
            reason: "Administrator attempted file content access without explicit DocumentPermission grant",
            requiredAccess: required,
          },
        }).catch(() => {});

        res.status(403).json({
          error: "Administrators do not have default access to view confidential document contents without an explicit grant.",
        });
        return;
      }

      req.document = doc;
      req.effectivePermission = explicitGrant.permissionLevel === PermissionLevel.EDIT ? "EDIT" : "READ";
      return next();
    }

    // If OWNER access is strictly required (e.g. sharing permissions, deleting doc),
    // and caller is not the owner, deny immediately.
    if (required === "OWNER") {
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.ACCESS_DENIED,
        documentId: doc.id,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: {
          reason: "Only the document owner can perform this operation",
          requiredAccess: "OWNER",
        },
      }).catch(() => {});

      res.status(403).json({ error: "Only the document owner can perform this action" });
      return;
    }

    // 3. Check DocumentPermission table for explicit active grant
    const activeGrant = await prisma.documentPermission.findFirst({
      where: {
        documentId: doc.id,
        userId: user.id,
        revokedAt: null, // Revocation is immediate upon setting revokedAt
      },
    });

    if (!activeGrant) {
      // Denied: No active grant exists for this user.
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.ACCESS_DENIED,
        documentId: doc.id,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: {
          reason: "No active permission grant found for document",
          requiredAccess: required,
        },
      }).catch(() => {});

      // Return 404 to avoid disclosing whether an unshared document exists
      res.status(404).json({ error: "Document not found or inaccessible" });
      return;
    }

    // 4. Verify permission level (READ vs EDIT)
    if (required === "EDIT") {
      if (activeGrant.permissionLevel !== PermissionLevel.EDIT) {
        await AuditService.recordEvent({
          actorUserId: user.id,
          actionType: AuditAction.ACCESS_DENIED,
          documentId: doc.id,
          outcome: AuditOutcome.DENIED,
          correlationId: req.correlationId || "unknown",
          metadata: {
            reason: "User has READ-only permission, but EDIT was requested",
            activePermission: activeGrant.permissionLevel,
          },
        }).catch(() => {});

        res.status(403).json({ error: "Insufficient permissions. You have READ-only access." });
        return;
      }
      req.effectivePermission = "EDIT";
    } else {
      req.effectivePermission = activeGrant.permissionLevel === PermissionLevel.EDIT ? "EDIT" : "READ";
    }

    req.document = doc;
    next();
  };
}
