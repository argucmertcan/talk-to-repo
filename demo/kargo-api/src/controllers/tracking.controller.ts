import type { Request, Response } from "express";
import { track } from "../services/tracking.service";

export async function trackHandler(req: Request, res: Response) {
  const t = await track(req.params.no);
  t ? res.json(t) : res.status(404).json({ error: "Bulunamadı" });
}
