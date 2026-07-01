import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import {
  requestId,
  corsMiddleware,
  helmetMiddleware,
  rateLimitMiddleware,
  requireApiKey,
  type ReqWithId,
  logError,
  sendError,
} from "./middleware.js";
import diagramRoutes from "./routes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5050);
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);

if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.disable("x-powered-by");
app.use(requestId);
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(express.json({ limit: "512kb" }));
if (rateLimitMiddleware) app.use(rateLimitMiddleware);

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  await migratePromise;
  requireApiKey(req, res, next);
});

app.use("/api", diagramRoutes);

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logError(req as ReqWithId, "unhandled", error);
  sendError(res, req as ReqWithId, 500, "Unexpected server error");
});

const migratePromise = migrate().catch((err: Error) => {
  console.error("[migration] Failed:", err.message);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

const shutdown = async () => {
  console.log("Shutting down...");
  server.close();
  await pool.end();
};

process.on("SIGTERM", () =>
  shutdown().catch((error) => console.error("Shutdown error", error)),
);
process.on("SIGINT", () =>
  shutdown().catch((error) => console.error("Shutdown error", error)),
);
