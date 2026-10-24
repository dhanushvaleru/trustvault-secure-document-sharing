import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { TestHarness, TestUser } from "../helpers/test-harness.js";
import { Role, PermissionLevel } from "../../src/types/index.js";

describe("Security: Permissions & Immediate Revocation", () => {
  let owner: TestUser;
  let viewer: TestUser;
  let unauthorizedViewer: TestUser;
  let docId: string;

  beforeAll(async () => {
    owner = await TestHarness.createUserAndLogin({
      name: "Owner Donna",
      email: "donna@test.local",
      role: Role.OWNER,
    });
    viewer = await TestHarness.createUserAndLogin({
      name: "Viewer Eric",
      email: "eric@test.local",
      role: Role.VIEWER,
    });
    unauthorizedViewer = await TestHarness.createUserAndLogin({
      name: "Viewer Frank",
      email: "frank@test.local",
      role: Role.VIEWER,
    });

    const uploadRes = await TestHarness.uploadDocument(
      owner,
      "policy-handbook.pdf",
      Buffer.from("%PDF-1.4\nDonna Security Policy\n%%EOF"),
      "Donna Security Policy",
      "LEGAL"
    );

    expect(uploadRes.status).toBe(201);
    docId = uploadRes.body.document.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Unauthorized viewer cannot manage document permissions", async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/permissions`)
      .set("Cookie", unauthorizedViewer.cookie)
      .send({
        userId: viewer.id,
        permissionLevel: PermissionLevel.READ,
      });

    expect(res.status).toBe(403);
  });

  it("Owner can grant READ access to a registered viewer", async () => {
    const res = await request(app)
      .post(`/api/documents/${docId}/permissions`)
      .set("Cookie", owner.cookie)
      .send({
        userId: viewer.id,
        permissionLevel: PermissionLevel.READ,
      });

    expect(res.status).toBe(201);
    expect(res.body.permission.permissionLevel).toBe(PermissionLevel.READ);
  });

  it("Granted viewer can read document metadata and download document", async () => {
    // 1. Read metadata
    const metaRes = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Cookie", viewer.cookie);
    expect(metaRes.status).toBe(200);
    expect(metaRes.body.document.title).toBe("Donna Security Policy");

    // 2. Download file
    const downloadRes = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set("Cookie", viewer.cookie);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.length).toBeGreaterThan(0);
    expect(downloadRes.body.toString()).toContain("%PDF");
  });

  it("Viewer cannot edit document with READ-only permission", async () => {
    const res = await request(app)
      .patch(`/api/documents/${docId}`)
      .set("Cookie", viewer.cookie)
      .send({ title: "Tampered by Viewer with READ" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/READ-only/i);
  });

  it("Owner can upgrade permission to EDIT, allowing the viewer to update metadata", async () => {
    // 1. Upgrade to EDIT
    const upgradeRes = await request(app)
      .patch(`/api/documents/${docId}/permissions/${viewer.id}`)
      .set("Cookie", owner.cookie)
      .send({ permissionLevel: PermissionLevel.EDIT });

    expect(upgradeRes.status).toBe(200);

    // 2. Viewer performs update
    const editRes = await request(app)
      .patch(`/api/documents/${docId}`)
      .set("Cookie", viewer.cookie)
      .send({ title: "Donna Security Policy v2 (Authorized Edit)" });

    expect(editRes.status).toBe(200);
    expect(editRes.body.document.title).toBe("Donna Security Policy v2 (Authorized Edit)");
  });

  it("IMMEDIATE REVOCATION: Revoking access instantly terminates read and download access", async () => {
    // 1. Revoke access
    const revokeRes = await request(app)
      .delete(`/api/documents/${docId}/permissions/${viewer.id}`)
      .set("Cookie", owner.cookie);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.message).toMatch(/revoked/i);

    // 2. Immediate read attempt by the viewer must fail
    const readAfterRevoke = await request(app)
      .get(`/api/documents/${docId}`)
      .set("Cookie", viewer.cookie);
    expect(readAfterRevoke.status).toBe(404);

    // 3. Immediate download attempt must fail and return ZERO document bytes
    const downloadAfterRevoke = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set("Cookie", viewer.cookie);
    expect(downloadAfterRevoke.status).toBe(404);
    expect(downloadAfterRevoke.text || "").not.toContain("%PDF");

    // 4. Edit attempt must fail
    const editAfterRevoke = await request(app)
      .patch(`/api/documents/${docId}`)
      .set("Cookie", viewer.cookie)
      .send({ title: "Malicious Edit Post-Revocation" });
    expect([403, 404]).toContain(editAfterRevoke.status);
  });
});
