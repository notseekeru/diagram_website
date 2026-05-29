import crypto from "crypto";
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

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);
const apiKey = process.env.API_KEY ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";
const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, "");
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
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

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// 3. Database Management Setup
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000, // Kill the wait after 5 seconds
  max: 10, // Limit the number of concurrent connections
});

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
    return res.status(401).json({ error: "Invalid API key" });
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
    console.error("Failed to save diagram", error);
    return res.status(500).json({ error: "Failed to save diagram" });
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
    console.error("Failed to update diagram", error);
    return res.status(500).json({ error: "Failed to update diagram" });
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
    console.error("Failed to fetch diagram", error);
    return res.status(500).json({ error: "Failed to fetch diagram" });
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
    console.error("Failed to list diagrams", error);
    return res.status(500).json({ error: "Failed to list diagrams" });
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
    console.error("Failed to delete diagram", error);
    return res.status(500).json({ error: "Failed to delete diagram" });
  }
});

// 5. Explicit Centralized Catch-All Error Handling Middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error", error);
  res.status(500).json({ error: "Unexpected server error" });
});

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
