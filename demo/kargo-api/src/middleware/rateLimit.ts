import type { Request, Response, NextFunction } from "express";

export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { n: number; at: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "anon";
    const now = Date.now();
    const h = hits.get(key);
    if (!h || now - h.at > opts.windowMs) hits.set(key, { n: 1, at: now });
    else if (++h.n > opts.max) return res.status(429).json({ error: "Çok fazla istek" });
    next();
  };
}
