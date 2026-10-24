import { app } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./db/prisma.js";

const server = app.listen(config.port, () => {
  console.log(`🔒 TrustVault Server running on http://localhost:${config.port}`);
  console.log(`🛡️  Environment: ${config.env}`);
  console.log(`📁 Private Storage: ${config.storageDir}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
