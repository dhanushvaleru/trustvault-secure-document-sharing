import request from "supertest";
import crypto from "crypto";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { AuthService } from "../../src/services/auth.service.js";
import { Role, UserStatus } from "../../src/types/index.js";
import { config } from "../../src/config/index.js";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  cookie: string;
  token: string;
}

export class TestHarness {
  /**
   * Creates a user in the test database and logs them in, returning session credentials.
   * Guarantees unique email per invocation to avoid collision.
   */
  static async createUserAndLogin(opts: {
    name: string;
    email: string;
    role?: Role;
    password?: string;
  }): Promise<TestUser> {
    const password = opts.password || "Password123!";
    const passwordHash = await AuthService.hashPassword(password);
    const role = opts.role || Role.OWNER;

    const emailParts = opts.email.split("@");
    const uniqueEmail = `${emailParts[0]}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@${emailParts[1] || "test.local"}`;

    const user = await prisma.user.create({
      data: {
        name: opts.name,
        email: uniqueEmail,
        passwordHash,
        role,
        status: UserStatus.ACTIVE,
      },
    });

    // Create session
    const { token } = await AuthService.createSession(user.id);
    const cookie = `${config.sessionCookieName}=${token}`;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      cookie,
      token,
    };
  }

  /**
   * Helper to upload a sample document via HTTP multipart.
   */
  static async uploadDocument(
    user: TestUser,
    filename: string,
    content: Buffer,
    title = "Test Document",
    category = "GENERAL"
  ) {
    return request(app)
      .post("/api/documents")
      .set("Cookie", user.cookie)
      .field("title", title)
      .field("category", category)
      .attach("file", content, filename);
  }
}
