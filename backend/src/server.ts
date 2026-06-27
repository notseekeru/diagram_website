import crypto from "crypto";
import { exec } from "child_process";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Pool } from "pg";

// For distributed tracing replace with OpenTelemetry trace ID.
let requestCounter = 0;
const nextId = () =>
  `req-${Date.now().toString(36)}-${(++requestCounter).toString(36)}`;

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5050);
const apiKey = process.env.API_KEY ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";
const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, "");
const defaultOrigins = [
  "http://localhost:5223",
  "http://127.0.0.1:5223",
  "diagram.seekeru.tech",
];
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ?? defaultOrigins.join(",")
)
  .split(",")
  .map((origin: string) => normalizeOrigin(origin))
  .filter(Boolean);
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);

if (!apiKey) {
  throw new Error("API_KEY is required");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.disable("x-powered-by");

// Attach a request ID for log correlation
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id: string }).id = nextId();
  next();
});

// 1. CORS Management Configuration
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  allowedHeaders: ["Content-Type", "X-API-Key"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 600,
};

app.use(cors(corsOptions));

// 2. Security Headers Layout
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(express.json({ limit: "512kb" }));

if (process.env.NODE_ENV !== "chaos") {
  app.use(rateLimit({ windowMs: 60000, limit: 120 }));
}

// 3. Database Management Setup
// SSL handled by connection string (?sslmode=require) for prod managed DB.
// Local postgres container doesn't need it.
const pool = new Pool({
  connectionString: databaseUrl,

  max: 50,
  min: 10,

  connectionTimeoutMillis: 2000,
  statement_timeout: 2000,
  query_timeout: 2000,
  idleTimeoutMillis: 30000,

  maxUses: 10000,
});

pool.on("error", (error: Error) => {
  console.error("[pool] Unexpected Postgres error", error);
});

type ReqWithId = Request & { id: string };

const logError = (req: ReqWithId, context: string, error: unknown) => {
  const summary = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      context,
      error: summary,
      // ponytail: full stack in NODE_ENV !== "production" to avoid leaking in prod
      ...(process.env.NODE_ENV !== "production" &&
        error instanceof Error && { stack: error.stack }),
    }),
  );
};

const sendError = (
  res: Response,
  req: ReqWithId,
  status: number,
  message: string,
) => {
  return res.status(status).json({ error: message, requestId: req.id });
};

const isValidApiKey = (provided: string) => {
  if (!provided || provided.length !== apiKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(apiKey));
};

// 4. Inbound Core Web Server Application API Routing Handlers
app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  const providedKey = req.header("X-API-Key") ?? "";
  if (!isValidApiKey(providedKey)) {
    return sendError(res, req as ReqWithId, 401, "Invalid API key");
  }
  return next();
});

type DiagramRow = {
  id: string;
  title: string;
  mermaid_text: string;
  created_at: string;
  updated_at: string;
};

type DiagramSummaryRow = Omit<DiagramRow, "mermaid_text">;

const normalizeTitle = (value: unknown) => {
  if (typeof value !== "string") {
    return "Untitled Diagram";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled Diagram";
};

const normalizeMermaid = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const parsePagination = (req: Request) => {
  const limit = Math.min(
    Number.parseInt(req.query.limit as string, 10) || 25,
    100,
  );
  const offset = Math.max(
    Number.parseInt(req.query.offset as string, 10) || 0,
    0,
  );
  return { limit, offset };
};

app.post("/api/save-diagram", async (req: Request, res: Response) => {
  const title = normalizeTitle(req.body?.title);
  const mermaidText = normalizeMermaid(req.body?.mermaidText);

  if (!mermaidText) {
    return res.status(400).json({ error: "mermaidText is required" });
  }

  if (mermaidText.length > 20_000) {
    return res.status(413).json({ error: "mermaidText is too large" });
  }

  try {
    const result = await pool.query<DiagramRow>(
      `
        INSERT INTO diagrams (title, mermaid_text)
        VALUES ($1, $2)
        RETURNING id, title, mermaid_text, created_at, updated_at
      `,
      [title, mermaidText],
    );

    return res.status(201).json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "save-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to save diagram");
  }
});

app.put("/api/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const title = normalizeTitle(req.body?.title);
  const mermaidText = normalizeMermaid(req.body?.mermaidText);

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid diagram id" });
  }

  if (!mermaidText) {
    return res.status(400).json({ error: "mermaidText is required" });
  }

  if (mermaidText.length > 20_000) {
    return res.status(413).json({ error: "mermaidText is too large" });
  }

  try {
    const result = await pool.query<DiagramRow>(
      `
        UPDATE diagrams
        SET title = $1,
            mermaid_text = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, title, mermaid_text, created_at, updated_at
      `,
      [title, mermaidText, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "update-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to update diagram");
  }
});

app.get("/api/get-diagram/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid diagram id" });
  }

  try {
    const result = await pool.query<DiagramRow>(
      `
        SELECT id, title, mermaid_text, created_at, updated_at
        FROM diagrams
        WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "get-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to fetch diagram");
  }
});

app.get("/api/diagrams", async (req: Request, res: Response) => {
  const { limit, offset } = parsePagination(req);

  try {
    const result = await pool.query<DiagramSummaryRow>(
      `
        SELECT id, title, created_at, updated_at
        FROM diagrams
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
      `,
      [limit, offset],
    );

    return res.json({ diagrams: result.rows, limit, offset });
  } catch (error) {
    logError(req as ReqWithId, "list-diagrams", error);
    return sendError(res, req as ReqWithId, 500, "Failed to list diagrams");
  }
});

app.delete("/api/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid diagram id" });
  }

  try {
    const result = await pool.query<{ id: string }>(
      "DELETE FROM diagrams WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    return res.status(204).send();
  } catch (error) {
    logError(req as ReqWithId, "delete-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to delete diagram");
  }
});

// 5. Explicit Centralized Catch-All Error Handling Middleware
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logError(req as ReqWithId, "unhandled", error);
  sendError(res, req as ReqWithId, 500, "Unexpected server error");
});

// Run migrations in background so server starts immediately.
// Migrations usually complete in <1s. If they fail, log and move on.
exec("npm run migrate:up", () => { /* noop — background task */ });

const server = app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

// 6. Graceful System Eviction Strategy Execution
const shutdown = async () => {
  console.log("Shutting down Application Server runtime execution layer...");
  server.close();
  await pool.end();
};

process.on("SIGTERM", () => {
  shutdown().catch((error) => console.error("Shutdown error", error));
});

process.on("SIGINT", () => {
  shutdown().catch((error) => console.error("Shutdown error", error));
});
