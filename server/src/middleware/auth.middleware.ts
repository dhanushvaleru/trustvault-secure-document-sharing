import { Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config/index.js";
import { AuthService } from "../services/auth.service.js";
import { AuthenticatedRequest, Role, UserStatus } from "../types/index.js";

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Ensure correlation ID exists on all incoming requests
  req.correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  res.setHeader("X-Correlation-ID", req.correlationId);

  // Extract session token from HttpOnly cookie or Authorization header
  let token = req.cookies?.[config.sessionCookieName];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const sessionData = await AuthService.validateSession(token);

    if (!sessionData) {
      // Clear invalid cookie
      res.clearCookie(config.sessionCookieName);
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    req.user = sessionData.user;
    req.sessionId = sessionData.sessionId;

    next();
  } catch (err) {
    res.status(500).json({ error: "Authentication verification failed" });
  }
}
