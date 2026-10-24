import { Response } from "express";
import { prisma } from "../db/prisma.js";
import { AuditService } from "../services/audit.service.js";
import { PermissionLevel, UserStatus, AuditAction, AuditOutcome } from "../types/index.js";
import { DocumentAuthorizedRequest } from "../middleware/document-access.middleware.js";

export class PermissionController {
  /**
   * List Permissions for a Document (OWNER only).
   */
  static async listPermissions(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;

    const permissions = await prisma.documentPermission.findMany({
      where: { documentId: doc.id },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        grantedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { grantedAt: "desc" },
    });

    res.json({ permissions });
  }

  /**
   * Grant Document Permission (OWNER only).
   */
  static async grantPermission(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const owner = req.user!;
    const { userId, permissionLevel } = req.body;

    // Disallow granting permission to oneself
    if (userId === owner.id) {
      res.status(400).json({ error: "You are already the owner of this document" });
      return;
    }

    // Target user must exist and be active
    const targetUser = await prisma.user.findUnique({
      where: { id: String(userId) },
    });

    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    if (targetUser.status !== UserStatus.ACTIVE) {
      res.status(400).json({ error: "Cannot grant permissions to an inactive user account" });
      return;
    }

    // Execute grant in a database transaction with audit logging
    const permission = await prisma.$transaction(async (tx) => {
      // Upsert: either update existing grant or create a new active one
      const existing = await tx.documentPermission.findUnique({
        where: {
          documentId_userId: {
            documentId: doc.id,
            userId: targetUser.id,
          },
        },
      });

      let grant;
      if (existing) {
        grant = await tx.documentPermission.update({
          where: { id: existing.id },
          data: {
            permissionLevel,
            grantedById: owner.id,
            grantedAt: new Date(),
            revokedAt: null, // Reset revocation if previously revoked
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            grantedBy: { select: { id: true, name: true, email: true } },
          },
        });
      } else {
        grant = await tx.documentPermission.create({
          data: {
            documentId: doc.id,
            userId: targetUser.id,
            permissionLevel,
            grantedById: owner.id,
            revokedAt: null,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            grantedBy: { select: { id: true, name: true, email: true } },
          },
        });
      }

      // Record audit event within the transaction
      await AuditService.recordEvent(
        {
          actorUserId: owner.id,
          actionType: AuditAction.PERM_GRANT,
          documentId: doc.id,
          targetUserId: targetUser.id,
          outcome: AuditOutcome.SUCCESS,
          correlationId: req.correlationId || "unknown",
          metadata: {
            permissionLevel,
            targetEmail: targetUser.email,
            documentTitle: doc.title,
          },
        },
        tx
      );

      return grant;
    });

    res.status(201).json({
      message: `Granted ${permissionLevel} permission to ${targetUser.email}`,
      permission,
    });
  }

  /**
   * Update an existing active grant (e.g. READ -> EDIT).
   */
  static async updatePermission(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const owner = req.user!;
    const targetUserId = String(req.params.userId);
    const { permissionLevel } = req.body;

    const existing = await prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: doc.id,
          userId: targetUserId,
        },
      },
      include: { user: true },
    });

    if (!existing || existing.revokedAt !== null) {
      res.status(404).json({ error: "Active permission grant not found for this user" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const grant = await tx.documentPermission.update({
        where: { id: existing.id },
        data: {
          permissionLevel,
          grantedById: owner.id,
          grantedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          grantedBy: { select: { id: true, name: true, email: true } },
        },
      });

      await AuditService.recordEvent(
        {
          actorUserId: owner.id,
          actionType: AuditAction.PERM_UPDATE,
          documentId: doc.id,
          targetUserId,
          outcome: AuditOutcome.SUCCESS,
          correlationId: req.correlationId || "unknown",
          metadata: {
            previousLevel: existing.permissionLevel,
            newLevel: permissionLevel,
          },
        },
        tx
      );

      return grant;
    });

    res.json({
      message: `Updated permission to ${permissionLevel}`,
      permission: updated,
    });
  }

  /**
   * Revoke Document Permission Immediately.
   */
  static async revokePermission(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const owner = req.user!;
    const targetUserId = String(req.params.userId);

    const existing = await prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: doc.id,
          userId: targetUserId,
        },
      },
      include: { user: true },
    });

    if (!existing || existing.revokedAt !== null) {
      res.status(404).json({ error: "No active permission found to revoke" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.documentPermission.update({
        where: { id: existing.id },
        data: {
          revokedAt: new Date(),
        },
      });

      await AuditService.recordEvent(
        {
          actorUserId: owner.id,
          actionType: AuditAction.PERM_REVOKE,
          documentId: doc.id,
          targetUserId,
          outcome: AuditOutcome.SUCCESS,
          correlationId: req.correlationId || "unknown",
          metadata: {
            revokedPermission: existing.permissionLevel,
            targetEmail: existing.user.email,
          },
        },
        tx
      );
    });

    res.json({ message: "Permission revoked successfully. Access terminates immediately." });
  }
}
