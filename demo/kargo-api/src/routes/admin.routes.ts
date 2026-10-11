import { Router } from "express";
import { listUsersHandler, exportHandler } from "../controllers/admin.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const adminRouter = Router();
adminRouter.get("/users", requireAuth, requireAdmin, listUsersHandler);
adminRouter.get("/export", exportHandler);
