import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthedRequest extends Request {
  user?: { id: number; role: "admin" | "staff" | "customer" };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Giriş gerekli" });
  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthedRequest["user"];
    next();
  } catch {
    res.status(401).json({ error: "Geçersiz oturum" });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Yetkisiz" });
  next();
}
