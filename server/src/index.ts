import { app } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./db/prisma.js";
import os from "os";

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const localIp = getLocalIp();
const HOST = "0.0.0.0";
const PORT = config.port; // 5000
const ALT_PORT = 8080;    // Port 8080 is pre-authorized in Windows Firewall across Public/Private profiles

const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🔒 TrustVault Enterprise Platform is Live & Running!`);
  console.log(`   💻 Laptop URL:          http://localhost:${PORT}`);
  console.log(`   📱 Mobile (Port 5000):  http://${localIp}:${PORT}`);
  console.log(`   📱 Mobile (Port 8080):  http://${localIp}:${ALT_PORT}`);
  console.log(`🛡️  Environment: ${config.env}`);
  console.log(`📁 Storage Dir:  ${config.storageDir}`);
  console.log(`=======================================================`);
});

// Dual listener on port 8080 (built-in Windows Firewall allow rule for Public Wi-Fi)
let altServer: any = null;
try {
  altServer = app.listen(ALT_PORT, HOST, () => {
    console.log(`🌐 Standby listener active on port ${ALT_PORT} (pre-whitelisted in Windows Firewall)`);
  });
  altServer.on("error", (err: any) => {
    console.warn(`Standby listener on port ${ALT_PORT} not started:`, err.message);
  });
} catch (e: any) {
  console.warn(`Could not bind alt port ${ALT_PORT}:`, e.message);
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  if (altServer) {
    try { altServer.close(); } catch {}
  }
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
