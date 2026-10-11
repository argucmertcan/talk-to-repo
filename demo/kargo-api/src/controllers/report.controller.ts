import type { Request, Response } from "express";
import { monthlyCustomerReport } from "../services/report.service";

export async function monthlyReportHandler(_req: Request, res: Response) {
  res.json(await monthlyCustomerReport());
}
