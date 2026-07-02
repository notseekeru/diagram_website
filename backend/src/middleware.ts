import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export type ReqWithId = Request & { id: string };

let requestCounter = 0;
const nextId = () =>
  `req-${Date.now().toString(36)}-${(++requestCounter).toString(36)}`;

export const requestId = (req: Request, _res: Response, next: NextFunction) => {
  (req as ReqWithId).id = nextId();
  next();
};

const ALLOWED_ORIGINS = [
  "http://localhost:5223",
  "http://127.0.0.1:5223",
  "https://seekeru.tech",
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allows server-to-server, Postman, and mobile app requests
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  allowedHeaders: ["Content-Type", "X-API-Key"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  maxAge: 600,
});

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const rateLimitMiddleware =
  process.env.NODE_ENV !== "chaos"
    ? rateLimit({ windowMs: 60000, limit: 120 })
    : null;

const apiKey = process.env.API_KEY ?? "";
if (!apiKey) throw new Error("API_KEY is required");

export const requireApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const provided = req.header("X-API-Key") ?? "";
  if (provided.length !== apiKey.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(apiKey))) {
    return res
      .status(401)
      .json({ error: "Invalid API key", requestId: (req as ReqWithId).id });
  }
  next();
};

export const logError = (req: ReqWithId, context: string, error: unknown) => {
  const summary = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      context,
      error: summary,
      ...(process.env.NODE_ENV !== "production" &&
        error instanceof Error && { stack: error.stack }),
    }),
  );
};

export const sendError = (
  res: Response,
  req: ReqWithId,
  status: number,
  message: string,
) => res.status(status).json({ error: message, requestId: req.id });
