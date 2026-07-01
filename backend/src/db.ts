import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export const pool = new Pool({
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
