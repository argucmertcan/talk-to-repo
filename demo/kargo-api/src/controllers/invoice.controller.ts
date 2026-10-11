import type { Request, Response } from "express";
import { markPaid } from "../services/invoice.service";

export async function markPaidHandler(req: Request, res: Response) {
  res.json(await markPaid(Number(req.params.id)));
}
