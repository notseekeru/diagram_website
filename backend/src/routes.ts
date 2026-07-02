import { type Request, type Response, Router } from "express";
import { z, ZodError } from "zod/v3";
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

const formatZodError = (err: ZodError) =>
  err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");

router.post("/save-diagram", async (req: Request, res: Response) => {
  const parsed = saveDiagramSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: formatZodError(parsed.error) });
  const { title, mermaidText } = parsed.data;
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
  const paramsCheck = idParamSchema.safeParse(req.params);
  if (!paramsCheck.success)
    return res.status(400).json({ error: formatZodError(paramsCheck.error) });
  const bodyCheck = updateDiagramSchema.safeParse({
    ...req.body,
    id: paramsCheck.data.id,
  });
  if (!bodyCheck.success)
    return res.status(400).json({ error: formatZodError(bodyCheck.error) });
  const { id, title, mermaidText } = bodyCheck.data;
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
  const paramsCheck = idParamSchema.safeParse(req.params);
  if (!paramsCheck.success)
    return res.status(400).json({ error: formatZodError(paramsCheck.error) });
  const { id } = paramsCheck.data;
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
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: formatZodError(parsed.error) });
  const { limit, offset } = parsed.data;
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
  const paramsCheck = idParamSchema.safeParse(req.params);
  if (!paramsCheck.success)
    return res.status(400).json({ error: formatZodError(paramsCheck.error) });
  const { id } = paramsCheck.data;
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
