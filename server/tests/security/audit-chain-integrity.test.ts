import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { AuditService } from "../../src/services/audit.service.js";
import { TestHarness, TestUser } from "../helpers/test-harness.js";
import { Role, AuditAction, AuditOutcome } from "../../src/types/index.js";

describe("Security: Tamper-Evident Audit Trail & Cryptographic Verification", () => {
  let admin: TestUser;
  let owner: TestUser;

  beforeAll(async () => {
    admin = await TestHarness.createUserAndLogin({
      name: "Audit Admin",
      email: "audit.admin@test.local",
      role: Role.ADMIN,
    });
    owner = await TestHarness.createUserAndLogin({
      name: "Audit Owner",
      email: "audit.owner@test.local",
      role: Role.OWNER,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Audit events are recorded for successful and denied operations", async () => {
    // 1. Successful upload
    const uploadRes = await TestHarness.uploadDocument(
      owner,
      "audit-check.txt",
      Buffer.from("Audit trail check content"),
      "Audit Trail Check",
      "GENERAL"
    );
    expect(uploadRes.status).toBe(201);
    const docId = uploadRes.body.document.id;

    // Check that DOC_UPLOAD audit event was created
    const uploadEvent = await prisma.auditEvent.findFirst({
      where: { documentId: docId, actionType: AuditAction.DOC_UPLOAD },
    });
    expect(uploadEvent).toBeDefined();
    expect(uploadEvent?.outcome).toBe(AuditOutcome.SUCCESS);
    expect(uploadEvent?.currentHash).toBeDefined();

    // 2. Denied unauthorized attempt (Admin without explicit grant is denied)
    await request(app)
      .get(`/api/documents/${docId}/download`)
      .set("Cookie", admin.cookie);

    const deniedEvent = await prisma.auditEvent.findFirst({
      where: { documentId: docId, outcome: AuditOutcome.DENIED },
    });
    expect(deniedEvent).toBeDefined();
    expect(deniedEvent?.actionType).toBe(AuditAction.ACCESS_DENIED);
  });

  it("Initial audit chain verification succeeds on valid untampered log", async () => {
    const verification = await AuditService.verifyChain();
    expect(verification.isValid).toBe(true);
    expect(verification.totalEvents).toBeGreaterThan(0);
  });

  it("Deleting a document does NOT erase its historical audit records", async () => {
    // 1. Upload and delete
    const uploadRes = await TestHarness.uploadDocument(
      owner,
      "to-be-deleted.txt",
      Buffer.from("Temporary document"),
      "Document to Delete",
      "GENERAL"
    );
    const docId = uploadRes.body.document.id;

    // Delete document
    const deleteRes = await request(app)
      .delete(`/api/documents/${docId}`)
      .set("Cookie", owner.cookie);
    expect(deleteRes.status).toBe(200);

    // Verify document is soft-deleted
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    expect(doc?.isDeleted).toBe(true);

    // Verify historical audit events remain completely intact!
    const auditEvents = await prisma.auditEvent.findMany({
      where: { documentId: docId },
    });
    expect(auditEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("Cryptographic verification detects DELIBERATE TAMPERING of an audit record", async () => {
    // 1. Create a pristine test event
    const record = await AuditService.recordEvent({
      actionType: "SECURITY_TEST_TAMPER",
      outcome: AuditOutcome.SUCCESS,
      correlationId: "tamper-test-uuid",
      metadata: { originalState: "AUTHENTIC_RECORD" },
    });

    // 2. Verify pristine chain passes
    const preCheck = await AuditService.verifyChain();
    expect(preCheck.isValid).toBe(true);

    // 3. Attacker with database access modifies the metadata of this event directly
    await prisma.auditEvent.update({
      where: { id: record.id },
      data: {
        metadataJson: JSON.stringify({ originalState: "TAMPERED_BY_ATTACKER" }),
      },
    });

    // 4. Re-run verification: Must fail with hash mismatch!
    const postCheck = await AuditService.verifyChain();
    expect(postCheck.isValid).toBe(false);
    expect(postCheck.brokenAtEventId).toBe(record.id);
    expect(postCheck.reason).toMatch(/Cryptographic hash mismatch/i);

    // 5. Restore pristine metadata to keep database valid for remaining tests
    await prisma.auditEvent.update({
      where: { id: record.id },
      data: {
        metadataJson: JSON.stringify({ originalState: "AUTHENTIC_RECORD" }),
      },
    });

    const restoredCheck = await AuditService.verifyChain();
    expect(restoredCheck.isValid).toBe(true);
  });

  it("Cryptographic verification detects DELETION of an audit record from the chain", async () => {
    // 1. Record two consecutive events
    const event1 = await AuditService.recordEvent({
      actionType: "CHAIN_EVENT_1",
      outcome: AuditOutcome.SUCCESS,
      correlationId: "corr-1",
    });
    const event2 = await AuditService.recordEvent({
      actionType: "CHAIN_EVENT_2",
      outcome: AuditOutcome.SUCCESS,
      correlationId: "corr-2",
    });

    // 2. Delete event1, creating a broken link in the previousHash chain
    await prisma.auditEvent.delete({
      where: { id: event1.id },
    });

    // 3. Chain verification must catch the gap
    const postDeleteCheck = await AuditService.verifyChain();
    expect(postDeleteCheck.isValid).toBe(false);
    expect(postDeleteCheck.reason).toMatch(/Broken chain link|Cryptographic hash mismatch/i);

    // Clean up event2
    await prisma.auditEvent.delete({
      where: { id: event2.id },
    });
  });
});
