import crypto from "node:crypto";
import cors from "cors";
import express, { type NextFunction, type Request, type Response, Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pool } from "./db.js";

const PORT = Number(process.env.PORT ?? 5050);
const API_KEY = process.env.API_KEY ?? "";
if (!API_KEY) throw new Error("API_KEY is required");

type DiagramRow = {
    id: string;
    title: string;
    mermaid_text: string;
    created_at: string;
    updated_at: string;
};

const validUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

const validMermaid = (v: unknown): v is string => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    return trimmed.length >= 1 && trimmed.length <= 10_000;
};

const logErr = (error: unknown) =>
    console.error(
        JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            ...(process.env.NODE_ENV !== "production" && error instanceof Error && { stack: error.stack }),
        }),
    );

const sErr = (res: Response, status: number, msg: string) => res.status(status).json({ error: msg });

const app = express();

app.set("trust proxy", 2);
app.disable("x-powered-by");

app.use(
    cors({
        origin: ["http://localhost:5223", "http://127.0.0.1:5223", "https://diagram.seekeru.tech"],
        allowedHeaders: ["Content-Type", "X-API-Key"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        maxAge: 600,
    }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "512kb" }));

if (process.env.NODE_ENV !== "chaos") app.use(rateLimit({ windowMs: 60000, limit: 120 }));

app.get("/healthz", (_req: Request, res: Response) => res.json({ status: "ok" }));

const api = Router();

api.post("/save-diagram", async (req: Request, res: Response) => {
    const { mermaidText } = req.body;
    if (!validMermaid(mermaidText)) return res.status(400).json({ error: "mermaidText is required (1-10,000 chars)" });

    const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 255) || "Untitled Diagram" : "Untitled Diagram";
    try {
        const result = await pool.query<DiagramRow>("INSERT INTO diagrams (title, mermaid_text) VALUES ($1, $2) RETURNING id, title, mermaid_text, created_at, updated_at", [title, mermaidText.trim()]);
        return res.status(201).json({ diagram: result.rows[0] });
    } catch (error) {
        logErr(error);
        return sErr(res, 500, "Failed to save diagram");
    }
});

api.put("/diagrams/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!validUuid(id)) return res.status(400).json({ error: "Invalid UUID" });

    const { mermaidText } = req.body;
    if (!validMermaid(mermaidText)) return res.status(400).json({ error: "mermaidText is required (1-10,000 chars)" });

    const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 255) || "Untitled Diagram" : "Untitled Diagram";
    try {
        const result = await pool.query<DiagramRow>("UPDATE diagrams SET title = $1, mermaid_text = $2, updated_at = NOW() WHERE id = $3 RETURNING id, title, mermaid_text, created_at, updated_at", [title, mermaidText.trim(), id]);
        if (!result.rows.length) return res.status(404).json({ error: "Diagram not found" });
        return res.json({ diagram: result.rows[0] });
    } catch (error) {
        logErr(error);
        return sErr(res, 500, "Failed to update diagram");
    }
});

api.get("/get-diagram/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!validUuid(id)) return res.status(400).json({ error: "Invalid UUID" });

    try {
        const result = await pool.query<DiagramRow>("SELECT id, title, mermaid_text, created_at, updated_at FROM diagrams WHERE id = $1", [id]);
        if (!result.rows.length) return res.status(404).json({ error: "Diagram not found" });
        return res.json({ diagram: result.rows[0] });
    } catch (error) {
        logErr(error);
        return sErr(res, 500, "Failed to fetch diagram");
    }
});

api.get("/diagrams", async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? ""), 10) || 25, 0), 100);
    const offset = Math.max(Number.parseInt(String(req.query.offset ?? ""), 10) || 0, 0);

    try {
        const result = await pool.query<Omit<DiagramRow, "mermaid_text">>("SELECT id, title, created_at, updated_at FROM diagrams ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
        return res.json({ diagrams: result.rows, limit, offset });
    } catch (error) {
        logErr(error);
        return sErr(res, 500, "Failed to list diagrams");
    }
});

api.delete("/diagrams/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!validUuid(id)) return res.status(400).json({ error: "Invalid UUID" });

    try {
        const result = await pool.query<{ id: string }>("DELETE FROM diagrams WHERE id = $1 RETURNING id", [id]);
        if (!result.rows.length) return res.status(404).json({ error: "Diagram not found" });
        return res.status(204).send();
    } catch (error) {
        logErr(error);
        return sErr(res, 500, "Failed to delete diagram");
    }
});

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const provided = req.header("X-API-Key") ?? "";
    if (provided.length !== API_KEY.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(API_KEY))) return res.status(401).json({ error: "Invalid API key" });
    next();
});
app.use("/api", api);

const server = app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

const shutdown = async () => {
    server.close();
    await pool.end();
};

process.on("SIGTERM", () => shutdown().catch((e) => console.error("Shutdown error", e)));
process.on("SIGINT", () => shutdown().catch((e) => console.error("Shutdown error", e)));
