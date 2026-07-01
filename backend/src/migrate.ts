import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const migrate = async (retries = 5, delay = 1000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { stdout, stderr } = await execAsync("npm run migrate:up");
      console.log(stdout);
      if (stderr) console.error("[migration:stderr]", stderr);
      console.log("[migration] Complete");
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < retries && msg.includes("ECONNREFUSED")) {
        console.log(
          `[migration] Postgres not ready (attempt ${attempt}/${retries}), retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      if (msg.includes("permission denied") || msg.includes("PGERROR")) {
        console.warn(
          "[migration] Skipped — DB user lacks DDL privileges. Assuming tables exist.",
        );
        return;
      }
      throw err;
    }
  }
};
