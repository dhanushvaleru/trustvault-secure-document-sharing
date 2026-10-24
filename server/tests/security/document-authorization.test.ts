import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { TestHarness, TestUser } from "../helpers/test-harness.js";
import { Role } from "../../src/types/index.js";

describe("Security: Document-Level Authorization & DAC", () => {
  let ownerA: TestUser;
  let ownerB: TestUser;
  let viewerA: TestUser;
  let admin: TestUser;
  let docAId: string;

  beforeAll(async () => {
    ownerA = await TestHarness.createUserAndLogin({
      name: "Owner Alice",
      email: "alice@test.local",
      role: Role.OWNER,
    });
    ownerB = await TestHarness.createUserAndLogin({
      name: "Owner Bob",
      email: "bob@test.local",
      role: Role.OWNER,
    });
    viewerA = await TestHarness.createUserAndLogin({
      name: "Viewer Charlie",
      email: "charlie@test.local",
      role: Role.VIEWER,
    });
    admin = await TestHarness.createUserAndLogin({
      name: "Security Admin",
      email: "admin2@test.local",
      role: Role.ADMIN,
    });

    // Owner A uploads a confidential document
    const uploadRes = await TestHarness.uploadDocument(
      ownerA,
      "confidential-plan.pdf",
      Buffer.from("%PDF-1.4\nOwner A Confidential Plan\n%%EOF"),
      "Alice Confidential Plan",
      "FINANCIAL"
    );

    expect(uploadRes.status).toBe(201);
    docAId = uploadRes.body.document.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Owner B cannot read Owner A's document metadata", async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set("Cookie", ownerB.cookie);

    expect(res.status).toBe(404);
  });

  it("Owner B cannot download Owner A's document", async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}/download`)
      .set("Cookie", ownerB.cookie);

    expect(res.status).toBe(404);
    // Never leak file bytes
    expect(res.body.byteLength || (res.text && res.text.includes("%PDF"))).toBeFalsy();
  });

  it("Owner B cannot edit Owner A's document", async () => {
    const res = await request(app)
      .patch(`/api/documents/${docAId}`)
      .set("Cookie", ownerB.cookie)
      .send({ title: "Tampered by Owner B" });

    expect([403, 404]).toContain(res.status);
  });

  it("Owner B cannot delete Owner A's document", async () => {
    const res = await request(app)
      .delete(`/api/documents/${docAId}`)
      .set("Cookie", ownerB.cookie);

    expect(res.status).toBe(403);
  });

  it("Viewer A cannot access an unshared document", async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}`)
      .set("Cookie", viewerA.cookie);

    expect(res.status).toBe(404);
  });

  it("Viewer A cannot download an unshared document", async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}/download`)
      .set("Cookie", viewerA.cookie);

    expect(res.status).toBe(404);
  });

  it("Administrator cannot read document contents merely by having ADMIN role", async () => {
    const res = await request(app)
      .get(`/api/documents/${docAId}/download`)
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Administrators do not have default access/i);
  });

  it("Search results do not disclose unauthorized document metadata", async () => {
    const res = await request(app)
      .get(`/api/documents?search=Alice`)
      .set("Cookie", viewerA.cookie);

    expect(res.status).toBe(200);
    // Viewer A has no grants for Alice's document, so search result list MUST be empty
    expect(res.body.documents.length).toBe(0);
  });

  it("Changing a document ID in request (IDOR) does not bypass authorization", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .get(`/api/documents/${fakeId}`)
      .set("Cookie", viewerA.cookie);

    expect(res.status).toBe(404);
  });

  it("MUTATION RESISTANCE: Unauthorized download fails and returns 0 file bytes", async () => {
    // Critical mutation-resistance test
    const res = await request(app)
      .get(`/api/documents/${docAId}/download`)
      .set("Cookie", viewerA.cookie);

    // Assert request is denied and no document bytes are returned
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).not.toContain("application/pdf");
    expect(res.body).not.toBeInstanceOf(Buffer);
  });
});
