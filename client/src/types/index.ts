export type Role = "ADMIN" | "OWNER" | "VIEWER";
export type UserStatus = "ACTIVE" | "DEACTIVATED";
export type PermissionLevel = "READ" | "EDIT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  _count?: {
    ownedDocuments: number;
    permissions: number;
  };
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  category: "FINANCIAL" | "LEGAL" | "HR" | "TECHNICAL" | "GENERAL";
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  effectivePermission: "OWNER" | "EDIT" | "READ" | "ADMIN_METADATA" | "NONE";
  activeSharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPermissionItem {
  id: string;
  documentId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  grantedAt: string;
  revokedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    status: UserStatus;
  };
  grantedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditEventItem {
  id: string;
  sequence: number;
  timestamp: string;
  actorUserId: string | null;
  actionType: string;
  documentId: string | null;
  targetUserId: string | null;
  outcome: "SUCCESS" | "DENIED";
  correlationId: string;
  metadataJson: string | null;
  previousHash: string;
  currentHash: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalDownloads: number;
  totalGrants: number;
  totalRevocations: number;
  deniedAccessAttempts: number;
  recentDenied24h: number;
  suspiciousActivityLevel: "NORMAL" | "ELEVATED";
}

export interface VerificationResult {
  isValid: boolean;
  totalEvents: number;
  verifiedAt: string;
  latestHash: string;
  brokenAtEventId?: string;
  brokenSequence?: number;
  brokenIndex?: number;
  reason?: string;
}
