import { z } from "zod";
import { Role, PermissionLevel, UserStatus, AuditOutcome } from "../types/index.js";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const createDocumentMetadataSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().trim().max(500).optional(),
  category: z.enum(["FINANCIAL", "LEGAL", "HR", "TECHNICAL", "GENERAL"]).default("GENERAL"),
});

export const updateDocumentMetadataSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(150).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.enum(["FINANCIAL", "LEGAL", "HR", "TECHNICAL", "GENERAL"]).optional(),
});

export const grantPermissionSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  permissionLevel: z.enum([PermissionLevel.READ, PermissionLevel.EDIT]),
});

export const updatePermissionSchema = z.object({
  permissionLevel: z.enum([PermissionLevel.READ, PermissionLevel.EDIT]),
});

export const updateUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.DEACTIVATED]),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  ownerId: z.string().uuid().optional(),
  sortBy: z.enum(["title", "createdAt", "fileSize", "category"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actionType: z.string().trim().optional(),
  outcome: z.enum([AuditOutcome.SUCCESS, AuditOutcome.DENIED]).optional(),
  actorUserId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
