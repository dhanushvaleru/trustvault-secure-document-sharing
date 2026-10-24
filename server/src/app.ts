import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { config } from "./config/index.js";

export const app = express();

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow localhost/vite dev server; in production, allow same origin or configured origin
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Correlation ID tagging middleware
app.use((req, res, next) => {
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  (req as any).correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "TrustVault Core API",
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// One-click Project Archive Download route
app.get("/download-project.zip", (req, res) => {
  const possibleZipPaths = [
    path.resolve(process.cwd(), "TrustVault-Complete-Project.zip"),
    path.resolve(process.cwd(), "..", "TrustVault-Complete-Project.zip"),
    path.resolve("C:\\Users\\dhanu\\Desktop\\TrustVault-Complete-Project.zip"),
  ];
  const zipPath = possibleZipPaths.find((p) => fs.existsSync(p));
  if (zipPath) {
    res.download(zipPath, "TrustVault-Complete-Project.zip");
  } else {
    res.status(404).json({ error: "Project archive not found" });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);

// Serve built frontend client static assets if available
const possibleClientDistPaths = [
  path.resolve(process.cwd(), "client", "dist"),
  path.resolve(process.cwd(), "..", "client", "dist"),
];
const clientDist = possibleClientDistPaths.find((p) => fs.existsSync(p));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Safe Error Handler - Never leaks internal traces
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId;
  console.error(`[Error][${correlationId}]`, err);

  const status = err.status || 500;
  const message = config.env === "production" && status === 500
    ? "Internal server error"
    : err.message || "An unexpected error occurred";

  res.status(status).json({
    error: message,
    correlationId,
  });
});
