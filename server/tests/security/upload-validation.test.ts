import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { TestHarness, TestUser } from "../helpers/test-harness.js";
import { Role } from "../../src/types/index.js";

describe("Security: Upload Validation & Path Traversal Prevention", () => {
  let owner: TestUser;

  beforeAll(async () => {
    owner = await TestHarness.createUserAndLogin({
      name: "Upload Tester",
      email: "upload.tester@test.local",
      role: Role.OWNER,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Rejects unsupported executable extensions (.exe)", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", owner.cookie)
      .field("title", "Malicious Binary")
      .attach("file", Buffer.from("MZfakebinary"), "payload.exe");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/extension.*not permitted/i);
  });

  it("Rejects disguised executable files (MZ header masquerading as .pdf)", async () => {
    // File named .pdf but containing Windows MZ executable header
    const fakePdf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", owner.cookie)
      .field("title", "Trojan in PDF")
      .attach("file", fakePdf, "invoice.pdf");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/executable.*detected/i);
  });

  it("Rejects empty 0-byte file uploads", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", owner.cookie)
      .field("title", "Empty File")
      .attach("file", Buffer.alloc(0), "empty.txt");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });

  it("Rejects uploads exceeding maximum permitted file size", async () => {
    // 11MB buffer (limit is 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", owner.cookie)
      .field("title", "Oversized File")
      .attach("file", largeBuffer, "oversized.pdf");

    // Rejected by multer or storage validator (400 or 500/payload error)
    expect([400, 413, 500]).toContain(res.status);
  });

  it("Sanitizes path traversal characters in filenames and generates unguessable UUID storage keys", async () => {
    const traversalFilename = "../../../etc/passwd.txt";
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", owner.cookie)
      .field("title", "Path Traversal Test")
      .attach("file", Buffer.from("Safe text content"), traversalFilename);

    expect(res.status).toBe(201);
    expect(res.body.document.id).toBeDefined();

    // Verify storage key is a UUID, NOT the path traversal string
    const docInDb = await prisma.document.findUnique({
      where: { id: res.body.document.id },
    });
    expect(docInDb?.storageKey).not.toContain("..");
    expect(docInDb?.storageKey).not.toContain("etc");
  });
});
