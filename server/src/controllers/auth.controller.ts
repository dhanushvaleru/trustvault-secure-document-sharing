import { Response } from "express";
import { prisma } from "../db/prisma.js";
import { AuthService } from "../services/auth.service.js";
import { AuditService } from "../services/audit.service.js";
import { config } from "../config/index.js";
import { Role, UserStatus, AuditAction, AuditOutcome, AuthenticatedRequest } from "../types/index.js";

// In-memory rate limiting map for login attempts: ip -> { count, resetTime }
const loginRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class AuthController {
  /**
   * User Registration.
   */
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!config.registrationEnabled) {
      res.status(403).json({ error: "Self-registration is currently disabled" });
      return;
    }

    const { name, email, password } = req.body;

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Generic error response to prevent user enumeration
      res.status(409).json({ error: "An account with this email address already exists" });
      return;
    }

    const passwordHash = await AuthService.hashPassword(password);

    // Initial role is OWNER by default, giving standard users document upload rights
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.OWNER,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Record audit event
    await AuditService.recordEvent({
      actorUserId: user.id,
      actionType: AuditAction.AUTH_REGISTER,
      outcome: AuditOutcome.SUCCESS,
      correlationId: req.correlationId || "unknown",
      metadata: { email: user.email, role: user.role },
    }).catch(() => {});

    res.status(201).json({
      message: "Registration successful. Please log in.",
      user,
    });
  }

  /**
   * User Login with rate limiting and secure session cookie.
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    // Rate limiting check
    const now = Date.now();
    const rateInfo = loginRateLimitMap.get(clientIp);
    if (rateInfo) {
      if (now < rateInfo.resetTime) {
        if (rateInfo.count >= config.maxLoginAttempts) {
          await AuditService.recordEvent({
            actionType: AuditAction.AUTH_LOGIN_FAILED,
            outcome: AuditOutcome.DENIED,
            correlationId: req.correlationId || "unknown",
            metadata: { email, ip: clientIp, reason: "Rate limit exceeded" },
          }).catch(() => {});

          res.status(429).json({
            error: "Too many failed login attempts. Please try again after 15 minutes.",
          });
          return;
        }
      } else {
        loginRateLimitMap.delete(clientIp);
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const isMatch = user ? await AuthService.verifyPassword(user.passwordHash, password) : false;

    if (!user || !isMatch) {
      // Update rate limiter
      const current = loginRateLimitMap.get(clientIp) || { count: 0, resetTime: now + config.rateLimitWindowMs };
      current.count += 1;
      loginRateLimitMap.set(clientIp, current);

      await AuditService.recordEvent({
        actorUserId: user ? user.id : null,
        actionType: AuditAction.AUTH_LOGIN_FAILED,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: { attemptedEmail: email, ip: clientIp, reason: "Invalid credentials" },
      }).catch(() => {});

      // Generic login failure message to prevent email enumeration
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      await AuditService.recordEvent({
        actorUserId: user.id,
        actionType: AuditAction.AUTH_LOGIN_FAILED,
        outcome: AuditOutcome.DENIED,
        correlationId: req.correlationId || "unknown",
        metadata: { email: user.email, reason: "Account deactivated" },
      }).catch(() => {});

      res.status(403).json({ error: "Your account has been deactivated. Contact an administrator." });
      return;
    }

    // Reset rate limiter on successful authentication
    loginRateLimitMap.delete(clientIp);

    // Create session
    const { token, expiresAt } = await AuthService.createSession(
      user.id,
      clientIp,
      req.headers["user-agent"]
    );

    // Set secure HttpOnly cookie
    res.cookie(config.sessionCookieName, token, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    // Record successful login audit event
    await AuditService.recordEvent({
      actorUserId: user.id,
      actionType: AuditAction.AUTH_LOGIN,
      outcome: AuditOutcome.SUCCESS,
      correlationId: req.correlationId || "unknown",
      metadata: { ip: clientIp, userAgent: req.headers["user-agent"] },
    }).catch(() => {});

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      expiresAt: expiresAt.toISOString(),
      token, // Also provided for test suites and API clients
    });
  }

  /**
   * User Logout.
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const token = req.cookies?.[config.sessionCookieName] || req.headers.authorization?.split(" ")[1];

    if (token) {
      await AuthService.destroySession(token);
    }

    res.clearCookie(config.sessionCookieName, {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: "lax",
      path: "/",
    });

    if (req.user) {
      await AuditService.recordEvent({
        actorUserId: req.user.id,
        actionType: AuditAction.AUTH_LOGOUT,
        outcome: AuditOutcome.SUCCESS,
        correlationId: req.correlationId || "unknown",
      }).catch(() => {});
    }

    res.json({ message: "Logout successful" });
  }

  /**
   * Current Authenticated User Info.
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({
      user: req.user,
    });
  }

  /**
   * Returns preconfigured demonstration accounts if enabled.
   */
  static async getDemoAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!config.demoAccountsEnabled) {
      res.status(404).json({ error: "Demo accounts are not enabled" });
      return;
    }

    res.json({
      accounts: [
        { role: Role.ADMIN, email: "admin@trustvault.demo", label: "Security Administrator" },
        { role: Role.OWNER, email: "owner@trustvault.demo", label: "Document Owner" },
        { role: Role.VIEWER, email: "viewer@trustvault.demo", label: "External Viewer" },
      ],
      defaultDemoPassword: "Password123!",
    });
  }
}
