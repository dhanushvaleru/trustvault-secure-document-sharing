import { Request } from "express";

export enum Role {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  VIEWER = "VIEWER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DEACTIVATED = "DEACTIVATED",
}

export enum PermissionLevel {
  READ = "READ",
  EDIT = "EDIT",
}

export enum AuditOutcome {
  SUCCESS = "SUCCESS",
  DENIED = "DENIED",
}

export enum AuditAction {
  // Authentication
  AUTH_REGISTER = "AUTH_REGISTER",
  AUTH_LOGIN = "AUTH_LOGIN",
  AUTH_LOGIN_FAILED = "AUTH_LOGIN_FAILED",
  AUTH_LOGOUT = "AUTH_LOGOUT",

  // Document Operations
  DOC_UPLOAD = "DOC_UPLOAD",
  DOC_READ_METADATA = "DOC_READ_METADATA",
  DOC_DOWNLOAD = "DOC_DOWNLOAD",
  DOC_UPDATE = "DOC_UPDATE",
  DOC_DELETE = "DOC_DELETE",

  // Permission Operations
  PERM_GRANT = "PERM_GRANT",
  PERM_UPDATE = "PERM_UPDATE",
  PERM_REVOKE = "PERM_REVOKE",

  // Admin & System Operations
  ADMIN_USER_STATUS_CHANGE = "ADMIN_USER_STATUS_CHANGE",
  ADMIN_AUDIT_VIEW = "ADMIN_AUDIT_VIEW",
  ADMIN_AUDIT_VERIFY = "ADMIN_AUDIT_VERIFY",

  // Security Violations / Denials
  ACCESS_DENIED = "ACCESS_DENIED",
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  sessionId?: string;
  correlationId?: string;
}

export interface AuditEventData {
  actorUserId?: string | null;
  actionType: AuditAction | string;
  documentId?: string | null;
  targetUserId?: string | null;
  outcome: AuditOutcome | string;
  correlationId: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}
