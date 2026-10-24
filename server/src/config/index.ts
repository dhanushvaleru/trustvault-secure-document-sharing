import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const possibleStorageDirs = [
  process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : null,
  path.resolve(process.cwd(), "storage"),
  path.resolve(process.cwd(), "..", "storage"),
].filter((d): d is string => Boolean(d));

let ROOT_STORAGE_DIR = possibleStorageDirs.find((d) => fs.existsSync(d));
if (!ROOT_STORAGE_DIR) {
  ROOT_STORAGE_DIR = path.resolve(process.cwd(), "storage");
  fs.mkdirSync(ROOT_STORAGE_DIR, { recursive: true });
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  sessionSecret: process.env.SESSION_SECRET || "trustvault-super-secure-session-secret-at-least-32-chars-long!",
  sessionCookieName: "trustvault_session",
  sessionTtlHours: parseInt(process.env.SESSION_TTL_HOURS || "8", 10),
  idleTimeoutMinutes: parseInt(process.env.IDLE_TIMEOUT_MINUTES || "60", 10),
  storageDir: ROOT_STORAGE_DIR,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES || "10485760", 10), // 10MB default
  registrationEnabled: process.env.REGISTRATION_ENABLED !== "false",
  demoAccountsEnabled: process.env.DEMO_ACCOUNTS_ENABLED !== "false",
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  maxLoginAttempts: 5, // max failed logins per window
};
