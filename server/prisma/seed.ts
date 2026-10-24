import { PrismaClient } from "@prisma/client";
import { AuthService } from "../src/services/auth.service.js";
import { StorageService } from "../src/services/storage.service.js";
import { AuditService } from "../src/services/audit.service.js";
import { Role, UserStatus, PermissionLevel, AuditAction, AuditOutcome } from "../src/types/index.js";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Password123!";

async function main() {
  console.log("🌱 Seeding TrustVault database with demonstration dataset...");

  // Clear existing records in proper dependency order
  await prisma.auditEvent.deleteMany({});
  await prisma.documentPermission.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await AuthService.hashPassword(DEMO_PASSWORD);

  // 1. Seed Accounts
  const admin = await prisma.user.create({
    data: {
      name: "Security Admin",
      email: "admin@trustvault.demo",
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Alice Owner",
      email: "owner@trustvault.demo",
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: "Bob Viewer",
      email: "viewer@trustvault.demo",
      passwordHash,
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log("✅ Seeded users:");
  console.log(`   Admin:  ${admin.email} (${admin.role})`);
  console.log(`   Owner:  ${owner.email} (${owner.role})`);
  console.log(`   Viewer: ${viewer.email} (${viewer.role})`);

  // Record Admin registration audit event
  await AuditService.recordEvent({
    actorUserId: admin.id,
    actionType: AuditAction.AUTH_REGISTER,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-001",
    metadata: { note: "Deterministic system bootstrap: admin account" },
  });

  // Record Owner login audit event
  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.AUTH_LOGIN,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-002",
    metadata: { note: "Owner logged in from seed script" },
  });

  // 2. Create Sample Documents & Files
  // Sample 1: Private Document (Only Alice Owner has access)
  const doc1Content = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Title (Q3 Confidential Financial Report) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );
  const doc1StorageKey = StorageService.generateStorageKey();
  await StorageService.storeFile(doc1StorageKey, doc1Content);

  const doc1 = await prisma.document.create({
    data: {
      title: "Q3 Confidential Financial Report",
      description: "Quarterly revenue, margins, and proprietary strategic projections.",
      category: "FINANCIAL",
      originalFilename: "Q3-Financial-Report.pdf",
      storageKey: doc1StorageKey,
      fileSize: doc1Content.length,
      mimeType: "application/pdf",
      checksumSha256: StorageService.computeChecksum(doc1Content),
      ownerId: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.DOC_UPLOAD,
    documentId: doc1.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-003",
    metadata: { title: doc1.title, category: doc1.category },
  });

  // Sample 2: Shared with Bob Viewer (READ permission)
  const doc2Content = Buffer.from(
    "TrustVault Secure Standard Employment Agreement\nAll intellectual property remains confidential."
  );
  const doc2StorageKey = StorageService.generateStorageKey();
  await StorageService.storeFile(doc2StorageKey, doc2Content);

  const doc2 = await prisma.document.create({
    data: {
      title: "Standard Employment Agreement Template",
      description: "Approved master employment and non-disclosure agreement for 2026.",
      category: "HR",
      originalFilename: "Employment-Agreement-Template.txt",
      storageKey: doc2StorageKey,
      fileSize: doc2Content.length,
      mimeType: "text/plain",
      checksumSha256: StorageService.computeChecksum(doc2Content),
      ownerId: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.DOC_UPLOAD,
    documentId: doc2.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-004",
    metadata: { title: doc2.title, category: doc2.category },
  });

  // Grant READ to Bob Viewer
  await prisma.documentPermission.create({
    data: {
      documentId: doc2.id,
      userId: viewer.id,
      permissionLevel: PermissionLevel.READ,
      grantedById: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.PERM_GRANT,
    documentId: doc2.id,
    targetUserId: viewer.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-005",
    metadata: { permissionLevel: PermissionLevel.READ, targetEmail: viewer.email },
  });

  // Sample 3: Shared with Bob Viewer (EDIT permission)
  const doc3Content = Buffer.from(
    "TrustVault Architecture Specification v2.0\nCryptographic hash chaining and zero-trust proxy design."
  );
  const doc3StorageKey = StorageService.generateStorageKey();
  await StorageService.storeFile(doc3StorageKey, doc3Content);

  const doc3 = await prisma.document.create({
    data: {
      title: "System Architecture Specification v2.0",
      description: "Detailed system component breakdown, cryptographic proofs, and threat mitigations.",
      category: "TECHNICAL",
      originalFilename: "System-Architecture-v2.txt",
      storageKey: doc3StorageKey,
      fileSize: doc3Content.length,
      mimeType: "text/plain",
      checksumSha256: StorageService.computeChecksum(doc3Content),
      ownerId: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.DOC_UPLOAD,
    documentId: doc3.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-006",
    metadata: { title: doc3.title, category: doc3.category },
  });

  // Grant EDIT to Bob Viewer
  await prisma.documentPermission.create({
    data: {
      documentId: doc3.id,
      userId: viewer.id,
      permissionLevel: PermissionLevel.EDIT,
      grantedById: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.PERM_GRANT,
    documentId: doc3.id,
    targetUserId: viewer.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-007",
    metadata: { permissionLevel: PermissionLevel.EDIT, targetEmail: viewer.email },
  });

  // Sample 4: Previously granted, now REVOKED
  const doc4Content = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Title (Legacy Vendor Agreement) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );
  const doc4StorageKey = StorageService.generateStorageKey();
  await StorageService.storeFile(doc4StorageKey, doc4Content);

  const doc4 = await prisma.document.create({
    data: {
      title: "Legacy Vendor Master Services Agreement",
      description: "Archived contract with previous external infrastructure supplier.",
      category: "LEGAL",
      originalFilename: "Legacy-Vendor-Agreement.pdf",
      storageKey: doc4StorageKey,
      fileSize: doc4Content.length,
      mimeType: "application/pdf",
      checksumSha256: StorageService.computeChecksum(doc4Content),
      ownerId: owner.id,
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.DOC_UPLOAD,
    documentId: doc4.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-008",
    metadata: { title: doc4.title, category: doc4.category },
  });

  // Create revoked grant
  await prisma.documentPermission.create({
    data: {
      documentId: doc4.id,
      userId: viewer.id,
      permissionLevel: PermissionLevel.READ,
      grantedById: owner.id,
      grantedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      revokedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // revoked 1 day ago
    },
  });

  await AuditService.recordEvent({
    actorUserId: owner.id,
    actionType: AuditAction.PERM_REVOKE,
    documentId: doc4.id,
    targetUserId: viewer.id,
    outcome: AuditOutcome.SUCCESS,
    correlationId: "seed-init-009",
    metadata: { targetEmail: viewer.email, reason: "Scheduled contract term expiration" },
  });

  // Sample Denied Access Event (Viewer attempted to download revoked doc4)
  await AuditService.recordEvent({
    actorUserId: viewer.id,
    actionType: AuditAction.ACCESS_DENIED,
    documentId: doc4.id,
    outcome: AuditOutcome.DENIED,
    correlationId: "seed-init-010",
    metadata: {
      reason: "No active permission grant found for document",
      requestedAccess: "READ",
    },
  });

  // Verify the audit chain integrity
  const verification = await AuditService.verifyChain();
  console.log("🔐 Cryptographic Audit Chain Verification:");
  console.log(`   Valid:        ${verification.isValid}`);
  console.log(`   Total Events: ${verification.totalEvents}`);
  console.log(`   Latest Hash:  ${verification.latestHash}`);

  if (!verification.isValid) {
    throw new Error(`Seeding audit chain validation failed: ${verification.reason}`);
  }

  console.log("🌟 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
