import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import express, {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();
const execAsync = promisify(exec);

// --- Config ------------------------------------------------------------------
const PORT = Number(process.env.PORT ?? 5050);
const API_KEY = process.env.API_KEY ?? "";
if (!API_KEY) throw new Error("API_KEY is required");

const proxyHops = parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);
const ALLOWED_ORIGINS = [
  "http://localhost:5223",
  "http://127.0.0.1:5223",
  "https://seekeru.tech",
];

// --- Types -------------------------------------------------------------------
type DiagramRow = {
  id: string;
  title: string;
  mermaid_text: string;
  created_at: string;
  updated_at: string;
};

// --- Helpers -----------------------------------------------------------------
const uuidRe = /^[0-9a-f-]{36}$/i;

const validUuid = (v: unknown): v is string =>
  typeof v === "string" && uuidRe.test(v);

const validMermaid = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  const trimmed = v.trim();
  return trimmed.length >= 1 && trimmed.length <= 20_000;
};

const cleanTitle = (v: unknown): string => {
  if (typeof v !== "string") return "Untitled Diagram";
  const s = v.trim().slice(0, 255);
  return s || "Untitled Diagram";
};

const toPosInt = (v: unknown, fallback: number): number =>
  Math.max(parseInt(String(v ?? ""), 10) || fallback, 0);

const reqId = (req: Request): string => (req as Request & { id: string }).id;

const logErr = (req: Request, ctx: string, error: unknown) =>
  console.error(
    JSON.stringify({
      requestId: reqId(req),
      method: req.method,
      path: req.originalUrl,
      context: ctx,
      error: error instanceof Error ? error.message : String(error),
      ...(process.env.NODE_ENV !== "production" &&
        error instanceof Error && { stack: error.stack }),
    }),
  );

const sErr = (res: Response, req: Request, status: number, msg: string) =>
  res.status(status).json({ error: msg, requestId: reqId(req) });

// --- App ---------------------------------------------------------------------
const app = express();

if (proxyHops > 0) app.set("trust proxy", proxyHops);
app.disable("x-powered-by");

// --- Middleware ---------------------------------------------------------------
let requestCounter = 0;
const nextId = () =>
  `req-${Date.now().toString(36)}-${(++requestCounter).toString(36)}`;

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id: string }).id = nextId();
  next();
});

app.use(
  cors({
    origin: (o, cb) => {
      if (!o || ALLOWED_ORIGINS.includes(o)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    allowedHeaders: ["Content-Type", "X-API-Key"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "512kb" }));

if (process.env.NODE_ENV !== "chaos")
  app.use(rateLimit({ windowMs: 60000, limit: 120 }));

app.get("/healthz", (_req: Request, res: Response) =>
  res.json({ status: "ok" }),
);

// --- Routes ------------------------------------------------------------------
const router = Router();

router.post("/save-diagram", async (req: Request, res: Response) => {
  const { mermaidText } = req.body;
  if (!validMermaid(mermaidText))
    return res.status(400).json({ error: "mermaidText is required (1-20,000 chars)" });

  const title = cleanTitle(req.body.title);
  try {
    const result = await pool.query<DiagramRow>(
      "INSERT INTO diagrams (title, mermaid_text) VALUES ($1, $2) RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText.trim()],
    );
    return res.status(201).json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req, "save-diagram", error);
    return sErr(res, req, 500, "Failed to save diagram");
  }
});

router.put("/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validUuid(id))
    return res.status(400).json({ error: "Invalid UUID" });

  const { mermaidText } = req.body;
  if (!validMermaid(mermaidText))
    return res.status(400).json({ error: "mermaidText is required (1-20,000 chars)" });

  const title = cleanTitle(req.body.title);
  try {
    const result = await pool.query<DiagramRow>(
      "UPDATE diagrams SET title = $1, mermaid_text = $2, updated_at = NOW() WHERE id = $3 RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText.trim(), id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req, "update-diagram", error);
    return sErr(res, req, 500, "Failed to update diagram");
  }
});

router.get("/get-diagram/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validUuid(id))
    return res.status(400).json({ error: "Invalid UUID" });

  try {
    const result = await pool.query<DiagramRow>(
      "SELECT id, title, mermaid_text, created_at, updated_at FROM diagrams WHERE id = $1",
      [id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req, "get-diagram", error);
    return sErr(res, req, 500, "Failed to fetch diagram");
  }
});

router.get("/diagrams", async (req: Request, res: Response) => {
  const limit = Math.min(toPosInt(req.query.limit, 25), 100);
  const offset = toPosInt(req.query.offset, 0);

  try {
    const result = await pool.query<Omit<DiagramRow, "mermaid_text">>(
      "SELECT id, title, created_at, updated_at FROM diagrams ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    return res.json({ diagrams: result.rows, limit, offset });
  } catch (error) {
    logErr(req, "list-diagrams", error);
    return sErr(res, req, 500, "Failed to list diagrams");
  }
});

router.delete("/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validUuid(id))
    return res.status(400).json({ error: "Invalid UUID" });

  try {
    const result = await pool.query<{ id: string }>(
      "DELETE FROM diagrams WHERE id = $1 RETURNING id",
      [id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.status(204).send();
  } catch (error) {
    logErr(req, "delete-diagram", error);
    return sErr(res, req, 500, "Failed to delete diagram");
  }
});

app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  await migratePromise;
  const provided = req.header("X-API-Key") ?? "";
  if (
    provided.length !== API_KEY.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(API_KEY))
  )
    return res.status(401).json({ error: "Invalid API key", requestId: reqId(req) });
  next();
});
app.use("/api", router);

// --- Error handler -----------------------------------------------------------
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logErr(req, "unhandled", error);
  sErr(res, req, 500, "Unexpected server error");
});

// --- Startup -----------------------------------------------------------------
const migrate = async (retries = 5, delay = 1000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await execAsync("npm run migrate:up");
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < retries && msg.includes("ECONNREFUSED")) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      if (msg.includes("permission denied") || msg.includes("PGERROR")) return;
      throw err;
    }
  }
};

const migratePromise = migrate().catch((err: Error) => {
  console.error("[migration] Failed:", err.message);
  process.exit(1);
});

const server = app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`),
);

const shutdown = async () => {
  server.close();
  await pool.end();
};

process.on("SIGTERM", () =>
  shutdown().catch((e) => console.error("Shutdown error", e)),
);
process.on("SIGINT", () =>
  shutdown().catch((e) => console.error("Shutdown error", e)),
);
