import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Body parser limit must exceed the 50MB file cap AFTER base64 inflation
  // (~33%), or large uploads get truncated and arrive as corrupt files.
  app.use(express.json({ limit: "80mb" }));
  app.use(express.urlencoded({ limit: "80mb", extended: true }));
  // Serve locally-stored uploads (used when the Forge storage proxy is absent)
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Last-resort error middleware: a malformed request URL (e.g. a bad %-escape)
  // makes Express throw a URIError during routing. Without this it bubbles up
  // and crashes the process; here we turn it into a 400 instead.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof URIError) {
      res.status(400).send("Bad Request");
      return;
    }
    console.error("[Express] Unhandled error:", err);
    if (!res.headersSent) res.status(500).send("Internal Server Error");
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Keep the dev server alive even if a stray async error escapes — log instead of crash.
process.on("uncaughtException", err => {
  console.error("[Process] Uncaught exception (kept alive):", err);
});
process.on("unhandledRejection", reason => {
  console.error("[Process] Unhandled rejection (kept alive):", reason);
});

startServer().catch(console.error);
