import { Response } from "express";
import { prisma } from "../db/prisma.js";
import { AuthService } from "../services/auth.service.js";
import { AuditService } from "../services/audit.service.js";
import { Role, UserStatus, AuditAction, AuditOutcome } from "../types/index.js";
import { AuthenticatedRequest } from "../types/index.js";
import { config } from "../config/index.js";

export class AdminController {
  /**
   * System Overview & Dashboard Metrics.
   */
  static async getDashboardMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const [
      totalUsers,
      activeUsers,
      totalDocuments,
      totalDownloads,
      totalGrants,
      totalRevocations,
      deniedAccessAttempts,
      recentAuditEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.document.count({ where: { isDeleted: false } }),
      prisma.auditEvent.count({ where: { actionType: AuditAction.DOC_DOWNLOAD, outcome: AuditOutcome.SUCCESS } }),
      prisma.auditEvent.count({ where: { actionType: AuditAction.PERM_GRANT, outcome: AuditOutcome.SUCCESS } }),
      prisma.auditEvent.count({ where: { actionType: AuditAction.PERM_REVOKE, outcome: AuditOutcome.SUCCESS } }),
      prisma.auditEvent.count({ where: { outcome: AuditOutcome.DENIED } }),
      prisma.auditEvent.findMany({
        take: 10,
        orderBy: { sequence: "desc" },
      }),
    ]);

    // Check for suspicious signals (e.g. denied events in last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDenied = await prisma.auditEvent.count({
      where: {
        outcome: AuditOutcome.DENIED,
        timestamp: { gte: twentyFourHoursAgo },
      },
    });

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalDocuments,
        totalDownloads,
        totalGrants,
        totalRevocations,
        deniedAccessAttempts,
        recentDenied24h: recentDenied,
        suspiciousActivityLevel: recentDenied > 10 ? "ELEVATED" : "NORMAL",
      },
      recentEvents: recentAuditEvents,
    });
  }

  /**
   * List Registered Users.
   */
  static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedDocuments: { where: { isDeleted: false } },
            permissions: { where: { revokedAt: null } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  }

  /**
   * Update User Account Status (Activate or Deactivate).
   */
  static async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const admin = req.user!;
    const targetUserId = String(req.params.id);
    const { status } = req.body;

    if (admin.id === targetUserId) {
      res.status(400).json({ error: "Administrators cannot change their own account status" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data: { status },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      // Record administrative audit event
      await AuditService.recordEvent(
        {
          actorUserId: admin.id,
          actionType: AuditAction.ADMIN_USER_STATUS_CHANGE,
          targetUserId,
          outcome: AuditOutcome.SUCCESS,
          correlationId: req.correlationId || "unknown",
          metadata: {
            targetEmail: targetUser.email,
            previousStatus: targetUser.status,
            newStatus: status,
          },
        },
        tx
      );

      return user;
    });

    // If deactivated, immediately invalidate all active sessions
    if (status === UserStatus.DEACTIVATED) {
      await AuthService.invalidateAllUserSessions(targetUserId);
    }

    res.json({
      message: `User ${targetUser.email} status changed to ${status}`,
      user: updated,
    });
  }

  /**
   * Search and Filter System Audit Logs.
   */
  static async listAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const {
      page = 1,
      limit = 25,
      actionType,
      outcome,
      actorUserId,
      documentId,
      startDate,
      endDate,
    } = req.query as any;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (actionType) where.actionType = String(actionType);
    if (outcome) where.outcome = String(outcome);
    if (actorUserId) where.actorUserId = String(actorUserId);
    if (documentId) where.documentId = String(documentId);

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(String(startDate));
      if (endDate) where.timestamp.lte = new Date(String(endDate));
    }

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        skip,
        take,
        orderBy: { sequence: "desc" },
      }),
    ]);

    res.json({
      events,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }

  /**
   * Cryptographically verify the tamper-evident audit hash chain.
   */
  static async verifyAuditChain(req: AuthenticatedRequest, res: Response): Promise<void> {
    const admin = req.user!;
    const verification = await AuditService.verifyChain();

    // Log the verification check
    await AuditService.recordEvent({
      actorUserId: admin.id,
      actionType: AuditAction.ADMIN_AUDIT_VERIFY,
      outcome: verification.isValid ? AuditOutcome.SUCCESS : AuditOutcome.DENIED,
      correlationId: req.correlationId || "unknown",
      metadata: {
        totalVerifiedEvents: verification.totalEvents,
        isValid: verification.isValid,
        reason: verification.reason,
      },
    }).catch(() => {});

    res.json({
      verification,
    });
  }

  /**
   * Generate an external cryptographically signed checkpoint.
   */
  static async generateCheckpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
    const checkpoint = await AuditService.generateCheckpoint(config.sessionSecret);
    res.json({ checkpoint });
  }
}
