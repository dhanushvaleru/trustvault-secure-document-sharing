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

const server = app.listen(config.port, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🔒 TrustVault Enterprise Platform is Live & Running!`);
  console.log(`   💻 Laptop (Local):   http://localhost:${config.port}`);
  console.log(`   📱 Mobile (Network): http://${localIp}:${config.port}`);
  console.log(`🛡️  Environment: ${config.env}`);
  console.log(`📁 Storage Dir:  ${config.storageDir}`);
  console.log(`=======================================================`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
