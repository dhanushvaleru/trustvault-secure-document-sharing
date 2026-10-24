import { Response } from "express";
import { prisma } from "../db/prisma.js";
import { StorageService } from "../services/storage.service.js";
import { AuditService } from "../services/audit.service.js";
import { Role, PermissionLevel, AuditAction, AuditOutcome } from "../types/index.js";
import { DocumentAuthorizedRequest } from "../middleware/document-access.middleware.js";

export class DocumentController {
  /**
   * Upload Document (OWNER or ADMIN).
   */
  static async uploadDocument(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      res.status(403).json({ error: "Only Document Owners and Administrators can upload files" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file was uploaded" });
      return;
    }

    const { title, description, category } = req.body;

    // Validate uploaded file bytes and signature
    const validation = StorageService.validateUploadedFile(
      file.originalname,
      file.buffer,
      file.mimetype
    );

    if (!validation.isValid) {
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.ACCESS_DENIED,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: {
          originalFilename: file.originalname,
          size: file.buffer.length,
          reason: validation.error,
        },
      }).catch(() => {});

      res.status(400).json({ error: validation.error || "File validation failed" });
      return;
    }

    const storageKey = StorageService.generateStorageKey();
    const checksum = StorageService.computeChecksum(file.buffer);
    const verifiedMime = validation.detectedMimeType || "application/octet-stream";

    let storedOnDisk = false;

    try {
      // 1. Write file to private storage
      await StorageService.storeFile(storageKey, file.buffer);
      storedOnDisk = true;

      // 2. Persist database record and audit event in transaction
      const document = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            title: title.trim(),
            description: description?.trim() || null,
            category: category || "GENERAL",
            originalFilename: file.originalname,
            storageKey,
            fileSize: file.buffer.length,
            mimeType: verifiedMime,
            checksumSha256: checksum,
            ownerId: user.id,
          },
        });

        // Fail-closed: record audit event within same transaction
        await AuditService.recordEvent(
          {
            actorUserId: user.id,
            actionType: AuditAction.DOC_UPLOAD,
            documentId: doc.id,
            outcome: AuditOutcome.SUCCESS,
            correlationId: req.correlationId || "unknown",
            metadata: {
              title: doc.title,
              category: doc.category,
              originalFilename: doc.originalFilename,
              fileSize: doc.fileSize,
              checksumSha256: doc.checksumSha256,
            },
          },
          tx
        );

        return doc;
      });

      res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          id: document.id,
          title: document.title,
          description: document.description,
          category: document.category,
          originalFilename: document.originalFilename,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          checksumSha256: document.checksumSha256,
          ownerId: document.ownerId,
          createdAt: document.createdAt,
        },
      });
    } catch (err) {
      // Clean up orphaned file on disk if DB transaction failed
      if (storedOnDisk) {
        await StorageService.removeFile(storageKey).catch(() => {});
      }
      res.status(500).json({ error: "Failed to complete document upload" });
    }
  }

  /**
   * List Documents (Server-Side Filtered & Authorized).
   */
  static async listDocuments(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const {
      page = 1,
      limit = 10,
      search,
      category,
      ownerId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as any;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build authorization filter:
    // ADMIN: Can view all non-deleted documents system-wide (metadata only)
    // OWNER: Can view owned documents OR documents shared with them
    // VIEWER: Can ONLY view documents explicitly shared with active grants
    let accessCondition: any = {};

    if (user.role === Role.ADMIN) {
      accessCondition = { isDeleted: false };
    } else if (user.role === Role.OWNER) {
      accessCondition = {
        isDeleted: false,
        OR: [
          { ownerId: user.id },
          {
            permissions: {
              some: {
                userId: user.id,
                revokedAt: null,
              },
            },
          },
        ],
      };
    } else {
      // VIEWER: strictly shared documents
      accessCondition = {
        isDeleted: false,
        permissions: {
          some: {
            userId: user.id,
            revokedAt: null,
          },
        },
      };
    }

    // Apply search filter (document name / title)
    const andConditions: any[] = [accessCondition];

    if (search && typeof search === "string" && search.trim().length > 0) {
      andConditions.push({
        title: {
          contains: search.trim(),
        },
      });
    }

    if (category && typeof category === "string") {
      andConditions.push({ category });
    }

    if (ownerId && typeof ownerId === "string") {
      andConditions.push({ ownerId });
    }

    const where = { AND: andConditions };

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          permissions: {
            where: { revokedAt: null },
            select: {
              id: true,
              userId: true,
              permissionLevel: true,
              grantedAt: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ]);

    // Map documents and annotate caller's effective access level
    const mapped = documents.map((doc) => {
      let callerPermission: string = "NONE";

      if (doc.ownerId === user.id) {
        callerPermission = "OWNER";
      } else if (user.role === Role.ADMIN) {
        const explicitGrant = doc.permissions.find((p) => p.userId === user.id);
        callerPermission = explicitGrant ? explicitGrant.permissionLevel : "ADMIN_METADATA";
      } else {
        const grant = doc.permissions.find((p) => p.userId === user.id);
        callerPermission = grant ? grant.permissionLevel : "NONE";
      }

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        originalFilename: doc.originalFilename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        checksumSha256: doc.checksumSha256,
        owner: doc.owner,
        effectivePermission: callerPermission,
        activeSharesCount: doc.permissions.length,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    res.json({
      documents: mapped,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }

  /**
   * Get Document Details.
   */
  static async getDocument(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const user = req.user!;

    const fullDoc = await prisma.document.findUnique({
      where: { id: doc.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        permissions: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            grantedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!fullDoc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Record audit event for metadata reading
    await AuditService.recordEvent({
      actorUserId: user.id,
      actionType: AuditAction.DOC_READ_METADATA,
      documentId: doc.id,
      outcome: AuditOutcome.SUCCESS,
      correlationId: req.correlationId || "unknown",
    }).catch(() => {});

    res.json({
      document: {
        id: fullDoc.id,
        title: fullDoc.title,
        description: fullDoc.description,
        category: fullDoc.category,
        originalFilename: fullDoc.originalFilename,
        fileSize: fullDoc.fileSize,
        mimeType: fullDoc.mimeType,
        checksumSha256: fullDoc.checksumSha256,
        owner: fullDoc.owner,
        effectivePermission: req.effectivePermission,
        permissions:
          req.effectivePermission === "OWNER" || user.role === Role.ADMIN
            ? fullDoc.permissions
            : [], // Hide granular ACL list from non-owners
        createdAt: fullDoc.createdAt,
        updatedAt: fullDoc.updatedAt,
      },
    });
  }

  /**
   * Update Document Metadata (Requires OWNER or EDIT grant).
   */
  static async updateDocument(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const user = req.user!;
    const { title, description, category } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.document.update({
        where: { id: doc.id },
        data: {
          title: title ? title.trim() : undefined,
          description: description !== undefined ? description?.trim() || null : undefined,
          category: category || undefined,
        },
      });

      await AuditService.recordEvent(
        {
          actorUserId: user.id,
          actionType: AuditAction.DOC_UPDATE,
          documentId: doc.id,
          outcome: AuditOutcome.SUCCESS,
          correlationId: req.correlationId || "unknown",
          metadata: {
            previous: { title: doc.title, category: doc.category },
            updated: { title: result.title, category: result.category },
          },
        },
        tx
      );

      return result;
    });

    res.json({
      message: "Document updated successfully",
      document: updated,
    });
  }

  /**
   * Delete Document (OWNER only).
   */
  static async deleteDocument(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const user = req.user!;

    try {
      // 1. Transaction to mark document deleted immediately and record audit
      await prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: doc.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });

        // Record deletion outcome while preserving audit integrity
        await AuditService.recordEvent(
          {
            actorUserId: user.id,
            actionType: AuditAction.DOC_DELETE,
            documentId: doc.id,
            outcome: AuditOutcome.SUCCESS,
            correlationId: req.correlationId || "unknown",
            metadata: {
              title: doc.title,
              storageKey: doc.storageKey,
            },
          },
          tx
        );
      });

      // 2. Physical storage cleanup
      await StorageService.removeFile(doc.storageKey).catch((storageErr) => {
        console.error("Storage cleanup error after document deletion:", storageErr);
      });

      res.json({ message: "Document deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  }

  /**
   * Secure Authenticated Download.
   * Enforces:
   * - Strict authorization check (owner or active READ grant).
   * - ADMIN role does NOT automatically bypass content authorization!
   * - Safe HTTP headers: Content-Disposition, X-Content-Type-Options: nosniff.
   * - Audit logging BEFORE file bytes are returned.
   */
  static async downloadDocument(req: DocumentAuthorizedRequest, res: Response): Promise<void> {
    const doc = req.document!;
    const user = req.user!;

    // ADMIN constraint check:
    // "An administrator must not automatically receive permission to read document contents merely because the account has the ADMIN role."
    if (user.role === Role.ADMIN && doc.ownerId !== user.id) {
      // Check if admin has an explicit grant
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
            reason: "Administrator attempted file download without explicit DocumentPermission grant",
          },
        }).catch(() => {});

        res.status(403).json({
          error: "Administrators do not have default access to view confidential document contents without an explicit grant.",
        });
        return;
      }
    }

    try {
      // Check physical file exists
      const fileBuffer = await StorageService.retrieveFile(doc.storageKey);

      // Record successful download audit event BEFORE streaming file
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.DOC_DOWNLOAD,
        documentId: doc.id,
        outcome: AuditOutcome.SUCCESS,
        correlationId: req.correlationId || "unknown",
        metadata: {
          originalFilename: doc.originalFilename,
          fileSize: doc.fileSize,
          checksumSha256: doc.checksumSha256,
        },
      });

      // Sanitize filename for Content-Disposition header
      const sanitizedFilename = doc.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", fileBuffer.length);
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizedFilename}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

      res.send(fileBuffer);
    } catch (err) {
      res.status(404).json({ error: "Document file content is unavailable" });
    }
  }
}
