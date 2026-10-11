import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err.message);
  res.status(500).json({ error: "Beklenmeyen hata" });
}
