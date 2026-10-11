import { Router } from "express";
import { monthlyReportHandler } from "../controllers/report.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const reportRouter = Router();
reportRouter.get("/monthly", requireAuth, requireAdmin, monthlyReportHandler);
