import { query } from "../db/client";

export function startCleanupJob() {
  setInterval(() => query("DELETE FROM reset_tokens WHERE expires_at < now()"), 60 * 60 * 1000);
}
