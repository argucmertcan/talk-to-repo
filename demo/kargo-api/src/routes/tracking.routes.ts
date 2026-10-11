import { Router } from "express";
import { trackHandler } from "../controllers/tracking.controller";

export const trackingRouter = Router();
trackingRouter.get("/:no", trackHandler);
