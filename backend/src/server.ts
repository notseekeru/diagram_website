import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import express, {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import { z, ZodError } from "zod/v3";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { pool } from "./db.js";

const execAsync = promisify(exec);
dotenv.config();

// --- Migrate -----------------------------------------------------------------
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

type ReqWithId = Request & { id: string };
type DiagramRow = {
  id: string;
  title: string;
  mermaid_text: string;
  created_at: string;
  updated_at: string;
};
type DiagramSummaryRow = Omit<DiagramRow, "mermaid_text">;

// --- App --------------------------------------------------------------------
const app = express();
const port = Number(process.env.PORT ?? 5050);
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);

if (Number.isFinite(trustProxyHops) && trustProxyHops > 0)
  app.set("trust proxy", trustProxyHops);
app.disable("x-powered-by");

// --- Middleware --------------------------------------------------------------
let requestCounter = 0;
const nextId = () =>
  `req-${Date.now().toString(36)}-${(++requestCounter).toString(36)}`;

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as ReqWithId).id = nextId();
  next();
});

const ALLOWED_ORIGINS = [
  "http://localhost:5223",
  "http://127.0.0.1:5223",
  "https://seekeru.tech",
];

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

const apiKey = process.env.API_KEY ?? "";
if (!apiKey) throw new Error("API_KEY is required");

app.get("/healthz", (_req: Request, res: Response) =>
  res.json({ status: "ok" }),
);

// --- Routes ------------------------------------------------------------------
const uuidSchema = z.string().regex(/^[0-9a-f-]{36}$/i, "Invalid UUID format");
const mermaidSchema = z
  .string()
  .trim()
  .min(1, "mermaidText is required")
  .max(20_000, "mermaidText exceeds 20,000 characters");
const titleIn = z.string().trim().min(1).max(255).optional();

const saveDiagramSchema = z
  .object({ title: titleIn, mermaidText: mermaidSchema })
  .transform((d) => ({
    title: d.title ?? "Untitled Diagram",
    mermaidText: d.mermaidText,
  }));
const updateDiagramSchema = z
  .object({ id: uuidSchema, title: titleIn, mermaidText: mermaidSchema })
  .transform((d) => ({
    id: d.id,
    title: d.title ?? "Untitled Diagram",
    mermaidText: d.mermaidText,
  }));
const idParamSchema = z.object({ id: uuidSchema });
const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .transform((d) => ({ limit: d.limit ?? 25, offset: d.offset ?? 0 }));

const fze = (err: ZodError) =>
  err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
const logErr = (req: ReqWithId, ctx: string, error: unknown) =>
  console.error(
    JSON.stringify({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      context: ctx,
      error: error instanceof Error ? error.message : String(error),
      ...(process.env.NODE_ENV !== "production" &&
        error instanceof Error && { stack: error.stack }),
    }),
  );
const sErr = (res: Response, req: ReqWithId, status: number, msg: string) =>
  res.status(status).json({ error: msg, requestId: req.id });

const router = Router();

router.post("/save-diagram", async (req: Request, res: Response) => {
  const parsed = saveDiagramSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: fze(parsed.error) });
  const { title, mermaidText } = parsed.data;
  try {
    const result = await pool.query<DiagramRow>(
      "INSERT INTO diagrams (title, mermaid_text) VALUES ($1, $2) RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText],
    );
    return res.status(201).json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req as ReqWithId, "save-diagram", error);
    return sErr(res, req as ReqWithId, 500, "Failed to save diagram");
  }
});

router.put("/diagrams/:id", async (req: Request, res: Response) => {
  const pc = idParamSchema.safeParse(req.params);
  if (!pc.success) return res.status(400).json({ error: fze(pc.error) });
  const bc = updateDiagramSchema.safeParse({ ...req.body, id: pc.data.id });
  if (!bc.success) return res.status(400).json({ error: fze(bc.error) });
  const { id, title, mermaidText } = bc.data;
  try {
    const result = await pool.query<DiagramRow>(
      "UPDATE diagrams SET title = $1, mermaid_text = $2, updated_at = NOW() WHERE id = $3 RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText, id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req as ReqWithId, "update-diagram", error);
    return sErr(res, req as ReqWithId, 500, "Failed to update diagram");
  }
});

router.get("/get-diagram/:id", async (req: Request, res: Response) => {
  const pc = idParamSchema.safeParse(req.params);
  if (!pc.success) return res.status(400).json({ error: fze(pc.error) });
  const { id } = pc.data;
  try {
    const result = await pool.query<DiagramRow>(
      "SELECT id, title, mermaid_text, created_at, updated_at FROM diagrams WHERE id = $1",
      [id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logErr(req as ReqWithId, "get-diagram", error);
    return sErr(res, req as ReqWithId, 500, "Failed to fetch diagram");
  }
});

router.get("/diagrams", async (req: Request, res: Response) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: fze(parsed.error) });
  const { limit, offset } = parsed.data;
  try {
    const result = await pool.query<DiagramSummaryRow>(
      "SELECT id, title, created_at, updated_at FROM diagrams ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    return res.json({ diagrams: result.rows, limit, offset });
  } catch (error) {
    logErr(req as ReqWithId, "list-diagrams", error);
    return sErr(res, req as ReqWithId, 500, "Failed to list diagrams");
  }
});

router.delete("/diagrams/:id", async (req: Request, res: Response) => {
  const pc = idParamSchema.safeParse(req.params);
  if (!pc.success) return res.status(400).json({ error: fze(pc.error) });
  const { id } = pc.data;
  try {
    const result = await pool.query<{ id: string }>(
      "DELETE FROM diagrams WHERE id = $1 RETURNING id",
      [id],
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Diagram not found" });
    return res.status(204).send();
  } catch (error) {
    logErr(req as ReqWithId, "delete-diagram", error);
    return sErr(res, req as ReqWithId, 500, "Failed to delete diagram");
  }
});

app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  await migratePromise;
  const provided = req.header("X-API-Key") ?? "";
  if (
    provided.length !== apiKey.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(apiKey))
  )
    return res
      .status(401)
      .json({ error: "Invalid API key", requestId: (req as ReqWithId).id });
  next();
});
app.use("/api", router);

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logErr(req as ReqWithId, "unhandled", error);
  sErr(res, req as ReqWithId, 500, "Unexpected server error");
});

const migratePromise = migrate().catch((err: Error) => {
  console.error("[migration] Failed:", err.message);
  process.exit(1);
});

const server = app.listen(port, () =>
  console.log(`Backend running on http://localhost:${port}`),
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
