import { createHash, randomBytes } from "crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
