import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { TestHarness, TestUser } from "../helpers/test-harness.js";
import { Role, UserStatus } from "../../src/types/index.js";

describe("Security: Authentication & Role Enforcement", () => {
  let admin: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    admin = await TestHarness.createUserAndLogin({
      name: "Admin User",
      email: "test.admin@test.local",
      role: Role.ADMIN,
    });
    viewer = await TestHarness.createUserAndLogin({
      name: "Viewer User",
      email: "test.viewer@test.local",
      role: Role.VIEWER,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Viewer cannot access administrative endpoints (returns 403)", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Cookie", viewer.cookie);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it("Administrator can access administrative endpoints", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Cookie", admin.cookie);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalUsers).toBeGreaterThanOrEqual(2);
  });

  it("Registration prevents privilege escalation (cannot register as ADMIN)", async () => {
    const uniqueAttackerEmail = `attacker-${Date.now()}@test.local`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Attacker Trying Admin",
        email: uniqueAttackerEmail,
        password: "StrongPassword123!",
        role: "ADMIN", // Mass assignment attack
      });

    expect(res.status).toBe(201);
    // Role MUST NOT be ADMIN, must default to OWNER or VIEWER
    expect(res.body.user.role).not.toBe(Role.ADMIN);
  });

  it("Deactivated user cannot continue using an existing session", async () => {
    const victim = await TestHarness.createUserAndLogin({
      name: "Victim User",
      email: "victim@test.local",
      role: Role.VIEWER,
    });

    // 1. Session is initially valid
    const initialRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", victim.cookie);
    expect(initialRes.status).toBe(200);

    // 2. Admin deactivates the victim user
    const deactivateRes = await request(app)
      .patch(`/api/admin/users/${victim.id}/status`)
      .set("Cookie", admin.cookie)
      .send({ status: UserStatus.DEACTIVATED });
    expect(deactivateRes.status).toBe(200);

    // 3. Victim tries to access protected endpoint with the previous session
    const postDeactivateRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", victim.cookie);

    // Must be rejected as 401 Unauthorized
    expect(postDeactivateRes.status).toBe(401);
  });

  it("Generic failure message prevents user enumeration during login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent.user.random.123@nowhere.com",
        password: "AnyPassword123!",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});
