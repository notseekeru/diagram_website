import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const migrate = async (retries = 5, delay = 1000): Promise<void> => {
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
      if (msg.includes("permission denied") || msg.includes("PGERROR")) {
        return;
      }
      throw err;
    }
  }
};
