import crypto from "crypto";
import * as argon2 from "@node-rs/argon2";
import { prisma } from "../db/prisma.js";
import { config } from "../config/index.js";
import { Role, UserStatus, SessionUser } from "../types/index.js";

// Argon2id recommended OWASP parameters
const ARGON2_OPTIONS: argon2.Options = {
  algorithm: argon2.Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,       // 2 iterations
  parallelism: 1,
  outputLen: 32,
};

export class AuthService {
  /**
   * Hashes a password using Argon2id.
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifies a plain password against an Argon2id hash.
   */
  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Generates a high-entropy session token and stores its SHA-256 hash.
   */
  static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        lastActiveAt: new Date(),
      },
    });

    return { token: rawToken, expiresAt };
  }

  /**
   * Validates a session token and returns the authenticated user if active.
   * Enforces expiration, idle timeout, and account active status.
   */
  static async validateSession(
    rawToken: string
  ): Promise<{ user: SessionUser; sessionId: string } | null> {
    if (!rawToken || typeof rawToken !== "string") {
      return null;
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    const now = new Date();

    // Check absolute expiration
    if (session.expiresAt <= now) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check idle timeout
    const idleTimeoutMs = config.idleTimeoutMinutes * 60 * 1000;
    if (now.getTime() - session.lastActiveAt.getTime() > idleTimeoutMs) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check if account is deactivated
    if (session.user.status !== UserStatus.ACTIVE) {
      // Invalidate all sessions for deactivated user
      await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
      return null;
    }

    // Refresh lastActiveAt if more than 60 seconds have elapsed (rate-limit db writes)
    if (now.getTime() - session.lastActiveAt.getTime() > 60000) {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActiveAt: now },
      }).catch(() => {});
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as Role,
        status: session.user.status as UserStatus,
      },
      sessionId: session.id,
    };
  }

  /**
   * Destroys a session on logout.
   */
  static async destroySession(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.session.deleteMany({
      where: { tokenHash },
    }).catch(() => {});
  }

  /**
   * Invalidates all active sessions for a user (e.g. upon deactivation or password change).
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }
}
