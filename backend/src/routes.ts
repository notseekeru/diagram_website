import { type Request, type Response, Router } from "express";
import { pool } from "./db.js";
import { type ReqWithId, logError, sendError } from "./middleware.js";

const router = Router();

type DiagramRow = {
  id: string;
  title: string;
  mermaid_text: string;
  created_at: string;
  updated_at: string;
};
type DiagramSummaryRow = Omit<DiagramRow, "mermaid_text">;

const normalizeTitle = (value: unknown) => {
  if (typeof value !== "string") return "Untitled Diagram";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled Diagram";
};

const normalizeMermaid = (value: unknown) => {
  if (typeof value !== "string") return "";
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

const uuidRe = /^[0-9a-f-]{36}$/i;
const validId = (id: string) => uuidRe.test(id);

router.post("/save-diagram", async (req: Request, res: Response) => {
  const title = normalizeTitle(req.body?.title);
  const mermaidText = normalizeMermaid(req.body?.mermaidText);
  if (!mermaidText)
    return res.status(400).json({ error: "mermaidText is required" });
  if (mermaidText.length > 20_000)
    return res.status(413).json({ error: "mermaidText is too large" });
  try {
    const result = await pool.query<DiagramRow>(
      "INSERT INTO diagrams (title, mermaid_text) VALUES ($1, $2) RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText],
    );
    return res.status(201).json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "save-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to save diagram");
  }
});

router.put("/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validId(id))
    return res.status(400).json({ error: "Invalid diagram id" });
  const title = normalizeTitle(req.body?.title);
  const mermaidText = normalizeMermaid(req.body?.mermaidText);
  if (!mermaidText)
    return res.status(400).json({ error: "mermaidText is required" });
  if (mermaidText.length > 20_000)
    return res.status(413).json({ error: "mermaidText is too large" });
  try {
    const result = await pool.query<DiagramRow>(
      "UPDATE diagrams SET title = $1, mermaid_text = $2, updated_at = NOW() WHERE id = $3 RETURNING id, title, mermaid_text, created_at, updated_at",
      [title, mermaidText, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "update-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to update diagram");
  }
});

router.get("/get-diagram/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validId(id))
    return res.status(400).json({ error: "Invalid diagram id" });
  try {
    const result = await pool.query<DiagramRow>(
      "SELECT id, title, mermaid_text, created_at, updated_at FROM diagrams WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Diagram not found" });
    return res.json({ diagram: result.rows[0] });
  } catch (error) {
    logError(req as ReqWithId, "get-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to fetch diagram");
  }
});

router.get("/diagrams", async (req: Request, res: Response) => {
  const { limit, offset } = parsePagination(req);
  try {
    const result = await pool.query<DiagramSummaryRow>(
      "SELECT id, title, created_at, updated_at FROM diagrams ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );
    return res.json({ diagrams: result.rows, limit, offset });
  } catch (error) {
    logError(req as ReqWithId, "list-diagrams", error);
    return sendError(res, req as ReqWithId, 500, "Failed to list diagrams");
  }
});

router.delete("/diagrams/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!validId(id))
    return res.status(400).json({ error: "Invalid diagram id" });
  try {
    const result = await pool.query<{ id: string }>(
      "DELETE FROM diagrams WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Diagram not found" });
    return res.status(204).send();
  } catch (error) {
    logError(req as ReqWithId, "delete-diagram", error);
    return sendError(res, req as ReqWithId, 500, "Failed to delete diagram");
  }
});

export default router;
