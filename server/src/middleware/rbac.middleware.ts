import { Response, NextFunction } from "express";
import { AuthenticatedRequest, Role, AuditAction, AuditOutcome } from "../types/index.js";
import { AuditService } from "../services/audit.service.js";

/**
 * Enforces role-based access control.
 * Rejects with 403 Forbidden and records an audit event on violation.
 */
export function requireRole(allowedRoles: Role[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Record access denial in audit log
      await AuditService.recordEvent({
        actorUserId: req.user.id,
        actionType: AuditAction.ACCESS_DENIED,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: {
          path: req.originalUrl,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          reason: "Role insufficient for administrative or privileged endpoint",
        },
      }).catch(() => {});

      res.status(403).json({ error: "Access denied. Insufficient privileges." });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole([Role.ADMIN]);
export const requireOwnerOrAdmin = requireRole([Role.OWNER, Role.ADMIN]);
