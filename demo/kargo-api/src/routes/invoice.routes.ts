import { Router } from "express";
import { markPaidHandler } from "../controllers/invoice.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const invoiceRouter = Router();
invoiceRouter.post("/:id/paid", requireAuth, requireAdmin, markPaidHandler);
